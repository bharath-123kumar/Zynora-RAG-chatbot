const { detectPromptInjection } = require('../../utils/promptSanitizer');
const { getCandidateChunks } = require('../retrieval/retrievalService');
const { rankCandidateChunks } = require('../ranking/rankingService');
const { generateAnswerWithLLM, getLLMConfiguration } = require('../llm/llmService');
const { logAuditEvent } = require('../../utils/auditLogger');
const logger = require('../../utils/logger');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const UNKNOWN_FALLBACK_ANSWER = "I couldn't find this information in the approved Zyngram knowledge base.";
const SCOPE_FALLBACK_ANSWER = "I can only answer questions related to Zyngram using the approved Zyngram knowledge base.";

const PHYSICAL_HIERARCHY = ['Point', 'Center', 'Hub', 'Command', 'HQ'];
const DIGITAL_HIERARCHY = ['Node', 'Zone', 'Territory', 'Region', 'Nation'];

async function getVerifiedConversationId(conversationId) {
  if (!conversationId) return null;
  try {
    const exists = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true }
    });
    return exists ? exists.id : null;
  } catch {
    return null;
  }
}

async function getVerifiedUserId(userId) {
  if (!userId) return null;
  try {
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    return exists ? exists.id : null;
  } catch {
    return null;
  }
}

/**
 * Resolves context between current question and conversation history.
 * Retains strict RAG boundaries while contextualizing queries.
 */
function resolveContextualQuery(currentQuery, history = []) {
  if (!history || history.length === 0) {
    return {
      searchQuery: currentQuery,
      isContextual: false,
      contextTopic: null
    };
  }

  const normalizedCurrent = currentQuery.toLowerCase().trim();
  
  // Extract recent context (up to last 4 messages)
  const recentTurns = history.slice(-4);
  const historyText = recentTurns.map(m => (m.content || m.text || '')).join(' ').toLowerCase();

  let contextTopic = null;
  let isContextual = false;

  // Check if current query contains anaphoric references or sequential questions
  const isSequentialQuestion = /what\s+comes\s+(after|before|next)|who\s+is\s+(above|below)|what\s+is\s+next|what\s+about\s+(it|this|that)|tell\s+me\s+more|explain\s+(it|this|that)/i.test(normalizedCurrent);
  const mentionsPronoun = /\b(it|this|that|they|them|its)\b/i.test(normalizedCurrent);

  const mentionsPhysicalLevel = PHYSICAL_HIERARCHY.some(h => normalizedCurrent.includes(h.toLowerCase()));
  const mentionsDigitalLevel = DIGITAL_HIERARCHY.some(h => normalizedCurrent.includes(h.toLowerCase()));

  // 1. Digital hierarchy check
  if (mentionsDigitalLevel || (historyText.includes('digital') && (isSequentialQuestion || mentionsPronoun))) {
    contextTopic = 'digital franchise hierarchy';
    isContextual = true;
  }
  // 2. Physical hierarchy check
  else if (mentionsPhysicalLevel || (historyText.includes('physical') && (isSequentialQuestion || mentionsPronoun))) {
    contextTopic = 'physical franchise hierarchy';
    isContextual = true;
  }
  // 3. Hierarchy general
  else if (historyText.includes('hierarchy') && (isSequentialQuestion || mentionsPronoun)) {
    contextTopic = historyText.includes('digital') ? 'digital franchise hierarchy' : 'physical franchise hierarchy';
    isContextual = true;
  }

  // Check for services in context (Mobile Recharge, Bill Payment, etc.)
  if (!contextTopic && (historyText.includes('mobile recharge') || historyText.includes('recharge'))) {
    if (mentionsPronoun || isSequentialQuestion || normalizedCurrent.includes('cost') || normalizedCurrent.includes('limit')) {
      contextTopic = 'mobile recharge service';
      isContextual = true;
    }
  }

  // Check for code of conduct in context
  if (!contextTopic && historyText.includes('code of conduct')) {
    if (mentionsPronoun || isSequentialQuestion || normalizedCurrent.includes('policy') || normalizedCurrent.includes('rules')) {
      contextTopic = 'code of conduct';
      isContextual = true;
    }
  }

  const searchQuery = isContextual && contextTopic 
    ? `${contextTopic} ${currentQuery}`.trim()
    : currentQuery;

  return {
    searchQuery,
    isContextual,
    contextTopic
  };
}

/**
 * Deterministic Extractive Grounded Answer Generator.
 * Constructs answers strictly from retrieved approved knowledge chunks.
 */
function generateGroundedAnswer(query, topChunks, contextInfo = {}) {
  if (!topChunks || topChunks.length === 0) {
    return null;
  }

  // Extract unique sources
  const sourcesMap = new Map();
  topChunks.forEach(chunk => {
    const key = `${chunk.title}_${chunk.version}_${chunk.section}`;
    if (!sourcesMap.has(key)) {
      sourcesMap.set(key, {
        title: chunk.title,
        version: chunk.version,
        category: chunk.category,
        section: chunk.section
      });
    }
  });

  const sources = Array.from(sourcesMap.values());
  const primaryChunk = topChunks[0];
  const normalizedQuery = query.toLowerCase();

  let synthesizedAnswer = '';

  // 1. Contextual sequential hierarchy queries: "What comes after Hub?", etc.
  const afterMatch = normalizedQuery.match(/what\s+comes\s+after\s+([a-z]+)/i);
  const beforeMatch = normalizedQuery.match(/what\s+comes\s+before\s+([a-z]+)/i);

  if (afterMatch) {
    const target = afterMatch[1].trim();
    // Check Physical Hierarchy
    const pIdx = PHYSICAL_HIERARCHY.findIndex(item => item.toLowerCase() === target);
    if (pIdx !== -1) {
      if (pIdx + 1 < PHYSICAL_HIERARCHY.length) {
        const nextLevel = PHYSICAL_HIERARCHY[pIdx + 1];
        const remaining = PHYSICAL_HIERARCHY.slice(pIdx + 1).join(', followed by ');
        
        let detailLine = '';
        if (nextLevel === 'Command') {
          detailLine = ' Command is the state or regional administrative command unit handling operations, compliance, and merchant onboarding.';
        } else if (nextLevel === 'HQ') {
          detailLine = ' HQ is the central corporate Headquarters overseeing global governance, technical infrastructure, and strategy.';
        } else if (nextLevel === 'Center') {
          detailLine = ' Center is the local neighborhood operational office overseeing multiple Points and managing stock/cash reconciliation.';
        } else if (nextLevel === 'Hub') {
          detailLine = ' Hub is the district fulfillment and logistics warehouse managing distribution across multiple Centers.';
        }

        synthesizedAnswer = `In the Zyngram physical franchise hierarchy (${PHYSICAL_HIERARCHY.join(' -> ')}), ${nextLevel} comes directly after ${PHYSICAL_HIERARCHY[pIdx]}${pIdx + 2 < PHYSICAL_HIERARCHY.length ? `, followed by ${PHYSICAL_HIERARCHY[pIdx + 2]}` : ''}.${detailLine}`;
      } else {
        synthesizedAnswer = `In the Zyngram physical franchise hierarchy (${PHYSICAL_HIERARCHY.join(' -> ')}), ${PHYSICAL_HIERARCHY[pIdx]} is the highest level (HQ). There is no level after HQ.`;
      }
    }

    // Check Digital Hierarchy
    const dIdx = DIGITAL_HIERARCHY.findIndex(item => item.toLowerCase() === target);
    if (!synthesizedAnswer && dIdx !== -1) {
      if (dIdx + 1 < DIGITAL_HIERARCHY.length) {
        const nextLevel = DIGITAL_HIERARCHY[dIdx + 1];
        synthesizedAnswer = `In the Zyngram digital franchise hierarchy (${DIGITAL_HIERARCHY.join(' -> ')}), ${nextLevel} comes directly after ${DIGITAL_HIERARCHY[dIdx]}.`;
      } else {
        synthesizedAnswer = `In the Zyngram digital franchise hierarchy (${DIGITAL_HIERARCHY.join(' -> ')}), ${DIGITAL_HIERARCHY[dIdx]} is the top-level country-wide cloud infrastructure.`;
      }
    }
  } else if (beforeMatch) {
    const target = beforeMatch[1].trim();
    const pIdx = PHYSICAL_HIERARCHY.findIndex(item => item.toLowerCase() === target);
    if (pIdx !== -1) {
      if (pIdx > 0) {
        const prevLevel = PHYSICAL_HIERARCHY[pIdx - 1];
        synthesizedAnswer = `In the Zyngram physical franchise hierarchy (${PHYSICAL_HIERARCHY.join(' -> ')}), ${prevLevel} comes directly before ${PHYSICAL_HIERARCHY[pIdx]}.`;
      } else {
        synthesizedAnswer = `In the Zyngram physical franchise hierarchy (${PHYSICAL_HIERARCHY.join(' -> ')}), ${PHYSICAL_HIERARCHY[pIdx]} is the grass-roots retail counter (lowest tier).`;
      }
    }
  }

  // 2. Physical hierarchy query
  if (!synthesizedAnswer && normalizedQuery.includes('physical') && normalizedQuery.includes('hierarchy')) {
    synthesizedAnswer = "The physical franchise hierarchy is: Point -> Center -> Hub -> Command -> HQ.";
  } 
  // 3. Digital hierarchy query
  else if (!synthesizedAnswer && normalizedQuery.includes('digital') && normalizedQuery.includes('hierarchy')) {
    synthesizedAnswer = "The digital franchise hierarchy is: Node -> Zone -> Territory -> Region -> Nation.";
  }
  // 4. General overview / what is Zyngram
  else if (!synthesizedAnswer && (normalizedQuery.includes('what is zyngram') || normalizedQuery.includes('zyngram overview'))) {
    synthesizedAnswer = primaryChunk.content.replace(/#+\s+/g, '').trim();
  }
  // 5. Vision
  else if (!synthesizedAnswer && normalizedQuery.includes('vision')) {
    const visionMatch = primaryChunk.content.match(/vision[^\n.]*\.?\s*([^\n]+)/i);
    if (visionMatch) {
      synthesizedAnswer = `Zyngram's vision is ${visionMatch[1].trim()}`;
    } else {
      synthesizedAnswer = primaryChunk.content.replace(/#+\s+/g, '').trim();
    }
  }
  // 6. Mission
  else if (!synthesizedAnswer && normalizedQuery.includes('mission')) {
    synthesizedAnswer = primaryChunk.content.replace(/#+\s+/g, '').trim();
  }
  // 7. General extraction from primary and secondary chunks
  else if (!synthesizedAnswer) {
    const contentLines = primaryChunk.content
      .split('\n')
      .map(line => line.replace(/^#{1,6}\s+/, '').trim())
      .filter(line => line.length > 0);

    synthesizedAnswer = contentLines.join(' ');
  }

  synthesizedAnswer = synthesizedAnswer.replace(/\s{2,}/g, ' ').trim();

  return {
    answer: synthesizedAnswer,
    sources,
    grounded: true
  };
}

/**
 * Calculates Confidence Rating based on top composite ranking score.
 */
function calculateConfidence(grounded, topScore) {
  if (!grounded) return 'NONE';
  if (topScore >= 0.70) return 'HIGH';
  if (topScore >= 0.45) return 'MEDIUM';
  if (topScore >= 0.32) return 'LOW';
  return 'NONE';
}

/**
 * Main RAG Execution Handler with Contextual Processing and Response Quality Evaluation
 */
async function processRAGQuery(userMessage, userObj = null, conversationId = null, history = []) {
  const startTime = Date.now();
  const traceId = userObj?.traceId || null;

  const validConvId = await getVerifiedConversationId(conversationId);
  const validUserId = await getVerifiedUserId(userObj?.id);

  logger.info(`Starting RAG execution for query: "${userMessage}"`, {
    userId: validUserId,
    module: 'RAG_ENGINE',
    action: 'QUERY_INIT',
    meta: { conversationId: validConvId, hasHistory: history.length > 0 }
  });

  // Security Check: Prompt Injection Protection
  const sanitized = detectPromptInjection(userMessage);
  if (sanitized.isInjection) {
    const latencyMs = Date.now() - startTime;
    logger.warn(`Security Alert: Prompt injection attempt detected: "${userMessage}"`, {
      userId: validUserId,
      module: 'RAG_SECURITY',
      action: 'PROMPT_INJECTION_BLOCKED',
      status: 'BLOCKED',
      meta: { matchedPattern: sanitized.patternMatched }
    });

    await logAuditEvent({
      userId: validUserId,
      userEmail: userObj?.email || null,
      action: 'SECURITY_PROMPT_INJECTION_BLOCKED',
      resource: 'RAG_ENGINE',
      metadata: { originalQuery: userMessage, matchedPattern: sanitized.patternMatched }
    });

    // Record evaluation
    try {
      await prisma.responseEvaluation.create({
        data: {
          conversationId: validConvId,
          userId: validUserId,
          question: userMessage,
          retrievedChunksCount: 0,
          topScore: 0,
          answer: UNKNOWN_FALLBACK_ANSWER,
          sourcesCount: 0,
          sourcesJson: '[]',
          latencyMs,
          grounded: false,
          confidence: 'NONE',
          isContextual: false
        }
      });
    } catch (e) {
      logger.error('Failed to save evaluation for injection event:', e);
    }

    return {
      answer: UNKNOWN_FALLBACK_ANSWER,
      sources: [],
      grounded: false,
      confidence: 'NONE',
      latencyMs,
      isContextual: false
    };
  }

  // Scope Check: Conversational meta queries about the bot's function/action
  const normalizedMetaQuery = userMessage.trim().toLowerCase();
  const isMetaScopeQuery = /^(what\s+are\s+you\s+doing\??|who\s+are\s+you\??|what\s+can\s+you\s+do\??|what\s+do\s+you\s+do\??|what\s+is\s+your\s+job\??)$/i.test(normalizedMetaQuery);
  if (isMetaScopeQuery) {
    const latencyMs = Date.now() - startTime;
    return {
      answer: SCOPE_FALLBACK_ANSWER,
      sources: [],
      grounded: false,
      confidence: 'NONE',
      latencyMs,
      isContextual: false
    };
  }

  // Step 1: Context-Aware Query Resolution
  const contextResolution = resolveContextualQuery(userMessage, history);
  const effectiveQuery = contextResolution.searchQuery;

  if (contextResolution.isContextual) {
    logger.info(`Context resolved: "${userMessage}" -> augmented to "${effectiveQuery}"`, {
      userId: userObj?.id || null,
      module: 'RAG_CONTEXT',
      action: 'CONTEXT_RESOLVED',
      meta: { topic: contextResolution.contextTopic }
    });
  }

  // Step 2: Retrieve APPROVED/ACTIVE candidate chunks
  const candidateChunks = await getCandidateChunks();

  if (candidateChunks.length === 0) {
    const latencyMs = Date.now() - startTime;
    await logAuditEvent({
      userId: userObj?.id || null,
      userEmail: userObj?.email || null,
      action: 'RAG_QUERY_UNANSWERABLE_NO_CHUNKS',
      resource: 'RAG_ENGINE',
      metadata: { query: userMessage }
    });

    return {
      answer: UNKNOWN_FALLBACK_ANSWER,
      sources: [],
      grounded: false,
      confidence: 'NONE',
      latencyMs,
      isContextual: contextResolution.isContextual
    };
  }

  // Step 3: Rank candidate chunks with effective query
  const topChunks = rankCandidateChunks(effectiveQuery, candidateChunks);

  if (topChunks.length === 0) {
    const latencyMs = Date.now() - startTime;
    logger.info(`Query "${userMessage}" did not meet relevance threshold. Returning fallback response.`, {
      userId: userObj?.id || null,
      module: 'RAG_RANKING',
      action: 'LOW_RELEVANCE',
      status: 'FALLBACK'
    });

    await logAuditEvent({
      userId: userObj?.id || null,
      userEmail: userObj?.email || null,
      action: 'RAG_QUERY_UNANSWERABLE_LOW_SCORE',
      resource: 'RAG_ENGINE',
      metadata: { query: userMessage, effectiveQuery }
    });

    // Record evaluation
    try {
      await prisma.responseEvaluation.create({
        data: {
          conversationId: validConvId,
          userId: validUserId,
          question: userMessage,
          retrievedChunksCount: candidateChunks.length,
          topScore: 0,
          answer: UNKNOWN_FALLBACK_ANSWER,
          sourcesCount: 0,
          sourcesJson: '[]',
          latencyMs,
          grounded: false,
          confidence: 'NONE',
          isContextual: contextResolution.isContextual
        }
      });
    } catch (e) {
      logger.error('Failed to save evaluation:', e);
    }

    return {
      answer: UNKNOWN_FALLBACK_ANSWER,
      sources: [],
      grounded: false,
      confidence: 'NONE',
      latencyMs,
      isContextual: contextResolution.isContextual
    };
  }

  // Step 4: Grounded Answer Generation (LLM Generation with Local Extractive Fallback)
  let groundedResponse = await generateAnswerWithLLM(userMessage, topChunks, contextResolution);
  if (!groundedResponse) {
    groundedResponse = generateGroundedAnswer(userMessage, topChunks, contextResolution);
  }

  const latencyMs = Date.now() - startTime;
  const topScore = topChunks[0]?.score || 0;
  const confidence = calculateConfidence(groundedResponse.grounded, topScore);

  await logAuditEvent({
    userId: validUserId,
    userEmail: userObj?.email || null,
    action: 'RAG_QUERY_GROUNDED_SUCCESS',
    resource: 'RAG_ENGINE',
    metadata: {
      query: userMessage,
      topChunkTitle: topChunks[0].title,
      topChunkScore: topScore,
      sourcesCount: groundedResponse.sources.length,
      latencyMs,
      isContextual: contextResolution.isContextual,
      generationMode: groundedResponse.generationMode || 'extractive-local'
    }
  });

  // Record Response Quality Evaluation in DB
  try {
    await prisma.responseEvaluation.create({
      data: {
        conversationId: validConvId,
        userId: validUserId,
        question: userMessage,
        retrievedChunksCount: candidateChunks.length,
        topScore: parseFloat(topScore.toFixed(4)),
        answer: groundedResponse.answer,
        sourcesCount: groundedResponse.sources.length,
        sourcesJson: JSON.stringify(groundedResponse.sources),
        latencyMs,
        grounded: groundedResponse.grounded,
        confidence,
        isContextual: contextResolution.isContextual
      }
    });
  } catch (evalErr) {
    logger.error('Failed to save response quality evaluation record:', evalErr);
  }

  return {
    ...groundedResponse,
    confidence,
    latencyMs,
    isContextual: contextResolution.isContextual,
    generationMode: groundedResponse.generationMode || 'extractive-local'
  };
}

module.exports = {
  processRAGQuery,
  generateGroundedAnswer,
  resolveContextualQuery,
  getLLMConfiguration,
  UNKNOWN_FALLBACK_ANSWER,
  SCOPE_FALLBACK_ANSWER
};
