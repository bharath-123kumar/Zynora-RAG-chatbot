const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

router.use(authenticateToken, requireAdmin);

router.get('/audit-logs', adminController.getAuditLogs);
router.get('/stats', adminController.getStats);

// Day 12 AI Monitoring Endpoints
router.get('/monitoring/overview', adminController.getMonitoringOverview);
router.get('/monitoring/questions', adminController.getMonitoringQuestions);
router.get('/monitoring/errors', adminController.getMonitoringErrors);
router.get('/monitoring/health', adminController.getMonitoringHealth);

module.exports = router;
