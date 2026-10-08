const { PrismaClient } = require('@prisma/client');
const { processRAGQuery, getLLMConfiguration } = require('../services/rag/ragService');
const { handleChat } = require('./chatController');
const { MIN_RELEVANCE_THRESHOLD } = require('../services/ranking/rankingService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * POST /api/rag/query or POST /api/rag
 * Direct RAG Retrieval & Generation Endpoint
 * Accepts { query } or { message }, optional conversationId, optional history
 */
async function handleRAGQuery(req, res, next) {
  try {
    const query = (req.body.query || req.body.message || '').trim();
    const conversationId = req.body.conversationId || null;
    let history = req.body.history || [];
    const user = req.user || null;

    let targetConversation = null;

    // Load conversation history if conversationId is specified
    if (conversationId) {
      targetConversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (targetConversation) {
        if (user && targetConversation.userId !== user.id) {
          return res.status(403).json({ error: 'Forbidden: You do not have access to this conversation' });
        }
        if (history.length === 0) {
          history = targetConversation.messages.map(m => ({
            role: m.role,
            content: m.content
          }));
        }
      }
    }

    // Execute RAG Query
    const ragResponse = await processRAGQuery(
      query,
      user,
      targetConversation ? targetConversation.id : null,
      history
    );

    // If active conversation exists, persist interaction
    if (targetConversation) {
      await prisma.message.create({
        data: {
          conversationId: targetConversation.id,
          role: 'user',
          content: query
        }
      });

      await prisma.message.create({
        data: {
          conversationId: targetConversation.id,
          role: 'assistant',
          content: ragResponse.answer,
          sources: JSON.stringify(ragResponse.sources || []),
          grounded: Boolean(ragResponse.grounded),
          confidence: ragResponse.confidence || 'NONE',
          latencyMs: ragResponse.latencyMs || 0
        }
      });
    }

    res.json({
      ...ragResponse,
      conversationId: targetConversation ? targetConversation.id : null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rag/status or GET /api/rag/health
 * Returns operational status of the RAG engine and LLM integration
 */
async function handleRAGStatus(req, res, next) {
  try {
    const activeChunks = await prisma.knowledgeChunk.count({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } }
    });
    const totalDocs = await prisma.knowledgeDocument.count({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } }
    });

    const llmConfig = getLLMConfiguration();

    res.json({
      status: 'ready',
      service: 'Zynora RAG API',
      version: '2.0.0',
      activeKnowledgeChunks: activeChunks,
      activeDocuments: totalDocs,
      relevanceThreshold: MIN_RELEVANCE_THRESHOLD,
      llmIntegration: {
        enabled: llmConfig.enabled,
        provider: llmConfig.provider,
        model: llmConfig.model,
        hasApiKey: Boolean(llmConfig.apiKey)
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleRAGQuery,
  handleRAGStatus,
  handleRAGChat: handleChat
};
