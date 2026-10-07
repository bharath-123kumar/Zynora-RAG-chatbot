const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function errorHandler(err, req, res, next) {
  const traceId = req.traceId || null;
  const userId = req.user?.id || null;
  const endpoint = req.originalUrl || req.url;
  const method = req.method;
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  logger.error(err.message || 'Unhandled error', {
    traceId,
    userId,
    module: 'API_ERROR_HANDLER',
    action: `${method}_${endpoint}`,
    status: 'FAILED',
    meta: { statusCode, stack: err.stack }
  });

  // Asynchronously record error to ErrorLog table
  try {
    await prisma.errorLog.create({
      data: {
        traceId,
        userId,
        endpoint,
        method,
        statusCode,
        message: err.message || 'Unknown error',
        stack: err.stack || null
      }
    });
  } catch (logErr) {
    console.error('Failed to persist error to ErrorLog table:', logErr.message);
  }

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    traceId,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler
};
