const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBody, ragQuerySchema, chatSchema } = require('../middleware/validateMiddleware');

// Middleware to extract optional token if provided
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return authenticateToken(req, res, next);
  }
  next();
}

// GET /api/rag/status and /api/rag/health
router.get('/status', ragController.handleRAGStatus);
router.get('/health', ragController.handleRAGStatus);

// POST /api/rag/query - direct RAG query endpoint
router.post('/query', optionalAuth, validateBody(ragQuerySchema), ragController.handleRAGQuery);

// POST /api/rag/chat - conversational RAG chat endpoint
router.post('/chat', optionalAuth, validateBody(chatSchema), ragController.handleRAGChat);

// POST /api/rag (root of router) - accepts query directly
router.post('/', optionalAuth, validateBody(ragQuerySchema), ragController.handleRAGQuery);

module.exports = router;
