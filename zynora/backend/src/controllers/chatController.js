const { PrismaClient } = require('@prisma/client');
const { processRAGQuery } = require('../services/rag/ragService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Create a new conversation for authenticated user
 */
async function createConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    const conversation = await prisma.conversation.create({
      data: {
        title: title?.trim() || 'New Conversation',
        userId
      }
    });

    logger.info(`Conversation created [${conversation.id}] for user [${req.user.email}]`, {
      userId,
      module: 'CONVERSATION',
      action: 'CONVERSATION_CREATED',
      meta: { conversationId: conversation.id }
    });

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

/**
 * List all conversations belonging to the authenticated user
 */
async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a specific conversation and its messages
 * CRITICAL SECURITY: Strict cross-user isolation. User can ONLY access their own conversation.
 */
async function getConversationById(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Strict cross-user isolation check
    if (conversation.userId !== userId) {
      logger.warn(`Security alert: Unauthorized access attempt to conversation [${id}] by user [${req.user.email}]`, {
        userId,
        module: 'SECURITY',
        action: 'CROSS_USER_ACCESS_BLOCKED',
        meta: { targetConversationId: id, ownerUserId: conversation.userId }
      });
      return res.status(403).json({ error: 'Forbidden: You do not have access to this conversation' });
    }

    // Parse sources JSON in messages
    const formattedMessages = conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      sources: (() => {
        try {
          return JSON.parse(msg.sources || '[]');
        } catch {
          return [];
        }
      })(),
      grounded: msg.grounded,
      confidence: msg.confidence,
      latencyMs: msg.latencyMs,
      createdAt: msg.createdAt
    }));

    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: formattedMessages
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Rename conversation title
 */
async function renameConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this conversation' });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title: title.trim() }
    });

    res.json({ conversation: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a conversation
 */
async function deleteConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this conversation' });
    }

    await prisma.conversation.delete({
      where: { id }
    });

    logger.info(`Conversation deleted [${id}] by user [${req.user.email}]`, {
      userId,
      module: 'CONVERSATION',
      action: 'CONVERSATION_DELETED',
      meta: { conversationId: id }
    });

    res.json({ message: 'Conversation deleted successfully', id });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear all messages in a conversation
 */
async function clearConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this conversation' });
    }

    await prisma.message.deleteMany({
      where: { conversationId: id }
    });

    res.json({ message: 'Conversation messages cleared', id });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle chat query with persistent message storage and context-awareness
 */
async function handleChat(req, res, next) {
  try {
    const { message, conversationId } = req.body;
    const user = req.user || null;
    let targetConversation = null;
    let history = [];

    // 1. If conversationId is provided, validate and load history
    if (conversationId) {
      targetConversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!targetConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (user && targetConversation.userId !== user.id) {
        logger.warn(`Security alert: User [${user.email}] attempted access to conversation [${conversationId}] owned by another user!`, {
          userId: user.id,
          module: 'SECURITY',
          action: 'CROSS_USER_CHAT_BLOCKED',
          meta: { conversationId, ownerUserId: targetConversation.userId }
        });
        return res.status(403).json({ error: 'Forbidden: You do not have access to this conversation' });
      }

      history = targetConversation.messages.map(m => ({
        role: m.role,
        content: m.content
      }));
    } else if (user) {
      // Auto-create new conversation for authenticated user if not provided
      const initialTitle = message.length > 30 ? message.slice(0, 30) + '...' : message;
      targetConversation = await prisma.conversation.create({
        data: {
          title: initialTitle,
          userId: user.id
        }
      });
    }

    // 2. Execute RAG query with conversation history for context resolution
    const ragResponse = await processRAGQuery(
      message,
      user,
      targetConversation ? targetConversation.id : null,
      history
    );

    // 3. Persist messages if conversation exists
    if (targetConversation) {
      // Save User Message
      await prisma.message.create({
        data: {
          conversationId: targetConversation.id,
          role: 'user',
          content: message
        }
      });

      // Save Assistant Message
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

      // Update conversation title if default "New Conversation"
      if (targetConversation.title === 'New Conversation') {
        const autoTitle = message.length > 35 ? message.slice(0, 35) + '...' : message;
        await prisma.conversation.update({
          where: { id: targetConversation.id },
          data: { title: autoTitle, updatedAt: new Date() }
        });
      } else {
        await prisma.conversation.update({
          where: { id: targetConversation.id },
          data: { updatedAt: new Date() }
        });
      }
    }

    res.json({
      ...ragResponse,
      conversationId: targetConversation ? targetConversation.id : null
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createConversation,
  getConversations,
  getConversationById,
  renameConversation,
  deleteConversation,
  clearConversation,
  handleChat
};
