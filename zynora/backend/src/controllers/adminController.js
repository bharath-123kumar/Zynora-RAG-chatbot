const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAuditLogs(req, res, next) {
  try {
    const { action, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' }
    });

    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const totalUsers = await prisma.user.count();
    const totalDocuments = await prisma.knowledgeDocument.count();
    const totalChunks = await prisma.knowledgeChunk.count();
    const activeChunks = await prisma.knowledgeChunk.count({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } }
    });
    const archivedChunks = await prisma.knowledgeChunk.count({
      where: { status: 'ARCHIVED' }
    });
    const totalAuditEvents = await prisma.auditLog.count();

    res.json({
      stats: {
        totalUsers,
        totalDocuments,
        totalChunks,
        activeChunks,
        archivedChunks,
        totalAuditEvents
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/monitoring/overview
 * Real data aggregation for the Monitoring Dashboard with date filtering
 */
async function getMonitoringOverview(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const dateWhere = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate) dateWhere.createdAt.gte = new Date(startDate);
      if (endDate) dateWhere.createdAt.lte = new Date(endDate);
    }

    // 1. Total Conversations & Total Questions
    const totalConversations = await prisma.conversation.count({ where: dateWhere });
    const totalQuestions = await prisma.responseEvaluation.count({ where: dateWhere });

    // 2. Successful (Grounded) Answers vs No-Answer Responses
    const successfulAnswers = await prisma.responseEvaluation.count({
      where: { grounded: true, ...dateWhere }
    });
    const noAnswerResponses = await prisma.responseEvaluation.count({
      where: { grounded: false, ...dateWhere }
    });

    // 3. Retrieval Failures (queries where no chunks met relevance threshold)
    const retrievalFailures = await prisma.auditLog.count({
      where: {
        action: { in: ['RAG_QUERY_UNANSWERABLE_NO_CHUNKS', 'RAG_QUERY_UNANSWERABLE_LOW_SCORE'] },
        ...dateWhere
      }
    });

    // 4. Average Response Time (ms)
    const avgLatencyResult = await prisma.responseEvaluation.aggregate({
      _avg: { latencyMs: true },
      where: dateWhere
    });
    const avgResponseTime = avgLatencyResult._avg.latencyMs 
      ? Math.round(avgLatencyResult._avg.latencyMs) 
      : 0;

    // 5. Error Count
    const errorCount = await prisma.errorLog.count({ where: dateWhere });

    // 6. Daily Questions for trend chart (last 7 days by default if no date specified)
    const evaluations = await prisma.responseEvaluation.findMany({
      where: dateWhere,
      select: { createdAt: true, grounded: true },
      orderBy: { createdAt: 'asc' }
    });

    const dailyMap = {};
    evaluations.forEach(ev => {
      const day = ev.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, total: 0, grounded: 0, ungrounded: 0 };
      }
      dailyMap[day].total++;
      if (ev.grounded) dailyMap[day].grounded++;
      else dailyMap[day].ungrounded++;
    });
    const dailyQuestions = Object.values(dailyMap);

    // 7. Knowledge Categories Breakdown
    const categoriesGroup = await prisma.knowledgeChunk.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: { in: ['APPROVED', 'ACTIVE'] } }
    });
    const knowledgeCategories = categoriesGroup.map(c => ({
      category: c.category,
      chunkCount: c._count.id
    }));

    // 8. Frequently Asked Questions
    const allQuestions = await prisma.responseEvaluation.findMany({
      where: dateWhere,
      select: { question: true, grounded: true }
    });

    const freqMap = {};
    allQuestions.forEach(q => {
      const trimmed = q.question.trim();
      if (!freqMap[trimmed]) {
        freqMap[trimmed] = { question: trimmed, count: 0, grounded: q.grounded };
      }
      freqMap[trimmed].count++;
    });

    const frequentlyAskedQuestions = Object.values(freqMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // 9. AI Service Health Status
    const activeChunks = await prisma.knowledgeChunk.count({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } }
    });

    const aiServiceHealth = {
      status: activeChunks > 0 ? 'HEALTHY' : 'DEGRADED',
      activeKnowledgeChunks: activeChunks,
      engineType: 'Local Deterministic Extractive RAG',
      externalApiDependencies: 0,
      uptimeSeconds: Math.round(process.uptime()),
      lastChecked: new Date().toISOString()
    };

    res.json({
      overview: {
        totalConversations,
        totalQuestions,
        dailyQuestions,
        successfulAnswers,
        noAnswerResponses,
        retrievalFailures,
        averageResponseTime: avgResponseTime,
        frequentlyAskedQuestions,
        knowledgeCategories,
        errorCount,
        aiServiceHealth
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/monitoring/questions
 * Filterable question log with quality evaluation details
 */
async function getMonitoringQuestions(req, res, next) {
  try {
    const { startDate, endDate, grounded, limit = 50 } = req.query;
    const where = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (grounded !== undefined) {
      where.grounded = grounded === 'true';
    }

    const evaluations = await prisma.responseEvaluation.findMany({
      where,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' }
    });

    res.json({ questions: evaluations });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/monitoring/errors
 * List real error logs recorded in the system
 */
async function getMonitoringErrors(req, res, next) {
  try {
    const { limit = 50 } = req.query;
    const errors = await prisma.errorLog.findMany({
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' }
    });

    res.json({ errors });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/monitoring/health
 * Deep AI and RAG health diagnostics
 */
async function getMonitoringHealth(req, res, next) {
  try {
    const activeChunks = await prisma.knowledgeChunk.count({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } }
    });
    const totalDocs = await prisma.knowledgeDocument.count();
    const recentErrors = await prisma.errorLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // past hour
      }
    });

    res.json({
      health: {
        status: activeChunks > 0 && recentErrors < 10 ? 'HEALTHY' : 'WARNING',
        database: 'CONNECTED',
        totalDocuments: totalDocs,
        activeKnowledgeChunks: activeChunks,
        recentErrorsLastHour: recentErrors,
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'production',
        ragRules: {
          externalAPIsDisabled: true,
          webSearchDisabled: true,
          onlyApprovedKnowledge: true
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAuditLogs,
  getStats,
  getMonitoringOverview,
  getMonitoringQuestions,
  getMonitoringErrors,
  getMonitoringHealth
};
