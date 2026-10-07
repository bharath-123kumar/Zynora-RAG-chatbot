const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');
const { validateBody, documentSchema } = require('../middleware/validateMiddleware');

// Public read access for knowledge list or authenticated admin management
router.get('/', knowledgeController.listDocuments);
router.get('/:id', knowledgeController.getDocument);

// Protected Admin Routes
router.post('/', authenticateToken, requireAdmin, validateBody(documentSchema), knowledgeController.createDocument);
router.put('/:id', authenticateToken, requireAdmin, knowledgeController.updateDocument);
router.post('/:id/approve', authenticateToken, requireAdmin, knowledgeController.approveDocument);
router.post('/:id/activate', authenticateToken, requireAdmin, knowledgeController.activateDocument);
router.post('/:id/archive', authenticateToken, requireAdmin, knowledgeController.archiveDocument);
router.post('/ingest/all', authenticateToken, requireAdmin, knowledgeController.triggerIngestAll);

module.exports = router;
