const logger = require('../../utils/logger');

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Detects configured LLM provider and credentials
 */
function getLLMConfiguration() {
  const geminiKey = process.env.GEMINI_API_KEY || null;
  const openaiKey = process.env.OPENAI_API_KEY || null;
  const configuredProvider = (process.env.LLM_PROVIDER || '').toLowerCase();

  let provider = 'none';
  let apiKey = null;
  let model = null;

  if (configuredProvider === 'gemini' && geminiKey) {
    provider = 'gemini';
    apiKey = geminiKey;
    model = DEFAULT_GEMINI_MODEL;
  } else if (configuredProvider === 'openai' && openaiKey) {
    provider = 'openai';
    apiKey = openaiKey;
    model = DEFAULT_OPENAI_MODEL;
  } else if (geminiKey) {
    provider = 'gemini';
    apiKey = geminiKey;
    model = DEFAULT_GEMINI_MODEL;
  } else if (openaiKey) {
    provider = 'openai';
    apiKey = openaiKey;
    model = DEFAULT_OPENAI_MODEL;
  }

  const enabled = provider !== 'none' && process.env.ENABLE_LLM !== 'false';

  return {
    enabled,
    provider,
    apiKey,
    model
  };
}

/**
 * Builds the strict RAG grounded prompt for the LLM
 */
function buildGroundedPrompt(query, topChunks, contextInfo = {}) {
  const chunksContext = topChunks
    .map((chunk, index) => {
      return `--- Chunk [${index + 1}] (${chunk.title} - ${chunk.section || 'General'}) ---\n${chunk.content.trim()}`;
    })
    .join('\n\n');

  const contextTopicInfo = contextInfo.isContextual && contextInfo.contextTopic
    ? `\nActive conversation topic: ${contextInfo.contextTopic}\n`
    : '';

  const systemPrompt = `You are Zynora, the official Knowledge Intelligence Assistant for Zyngram Enterprise.
Your duty is to formulate concise, grounded, and accurate answers strictly based on the provided approved documentation chunks.

CRITICAL OPERATIONAL RULES:
1. ONLY utilize the knowledge provided in the Approved Context Chunks below.
2. DO NOT hallucinate, infer facts not present, extrapolate, or use outside training knowledge.
3. If the answer cannot be found completely in the Approved Context Chunks, you MUST respond EXACTLY with:
"I couldn't find this information in the approved Zyngram knowledge base."
4. If the question can be answered, provide a direct, professional, and clear answer.
5. Preserve key terms, hierarchy names, and step-by-step processes accurately.`;

  const userPrompt = `${systemPrompt}

${contextTopicInfo}
APPROVED CONTEXT CHUNKS:
${chunksContext}

USER QUESTION:
${query}

GROUNDED ANSWER:`;

  return {
    systemPrompt,
    userPrompt
  };
}

/**
 * Calls Google Gemini REST API with timeout
 */
async function callGeminiAPI(apiKey, model, prompt, timeoutMs = 10000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800
        }
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (Status ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned empty response');
    }

    return candidateText.trim();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Calls OpenAI REST API with timeout
 */
async function callOpenAIAPI(apiKey, model, systemPrompt, userPrompt, timeoutMs = 10000) {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const url = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 800
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (Status ${response.status}): ${errText}`);
    }

    const data = await response.json();
    const messageContent = data?.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('OpenAI API returned empty response');
    }

    return messageContent.trim();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Attempts to generate an answer using the configured LLM API.
 * Returns null if LLM is not configured or if generation fails.
 */
async function generateAnswerWithLLM(query, topChunks, contextInfo = {}) {
  const config = getLLMConfiguration();
  if (!config.enabled) {
    return null;
  }

  const { systemPrompt, userPrompt } = buildGroundedPrompt(query, topChunks, contextInfo);

  try {
    logger.info(`Invoking LLM API (${config.provider}/${config.model}) for grounded generation...`);
    let generatedText = '';

    if (config.provider === 'gemini') {
      generatedText = await callGeminiAPI(config.apiKey, config.model, userPrompt);
    } else if (config.provider === 'openai') {
      generatedText = await callOpenAIAPI(config.apiKey, config.model, systemPrompt, userPrompt);
    }

    if (!generatedText) {
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
    const isFallback = generatedText.includes("couldn't find this information") ||
      generatedText.includes("I cannot find this information");

    return {
      answer: generatedText,
      sources: isFallback ? [] : sources,
      grounded: !isFallback,
      provider: config.provider,
      model: config.model,
      generationMode: 'llm-grounded'
    };
  } catch (err) {
    logger.warn(`LLM API generation failed: ${err.message}. Falling back to deterministic extractive generator.`);
    return null;
  }
}

module.exports = {
  getLLMConfiguration,
  generateAnswerWithLLM,
  buildGroundedPrompt
};
