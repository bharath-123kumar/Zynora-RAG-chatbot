const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  validateBody,
  chatSchema,
  createConversationSchema,
  renameConversationSchema
} = require('../middleware/validateMiddleware');

// --- Conversation Management Routes (Require Authentication) ---
router.post('/conversations', authenticateToken, validateBody(createConversationSchema), chatController.createConversation);
router.get('/conversations', authenticateToken, chatController.getConversations);
router.get('/conversations/:id', authenticateToken, chatController.getConversationById);
router.patch('/conversations/:id', authenticateToken, validateBody(renameConversationSchema), chatController.renameConversation);
router.delete('/conversations/:id', authenticateToken, chatController.deleteConversation);
router.post('/conversations/:id/clear', authenticateToken, chatController.clearConversation);

// --- Core Zynora Chat Route (Optional Auth for testing/guest, required for persistence) ---
router.post('/chat', validateBody(chatSchema), (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return authenticateToken(req, res, () => chatController.handleChat(req, res, next));
  }
  return chatController.handleChat(req, res, next);
});

module.exports = router;
