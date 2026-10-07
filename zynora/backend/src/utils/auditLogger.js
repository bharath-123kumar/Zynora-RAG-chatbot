const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

async function logAuditEvent({ userId = null, userEmail = null, action, resource, metadata = {} }) {
  try {
    // Exclude sensitive fields like passwords from metadata logging
    const safeMetadata = { ...metadata };
    if (safeMetadata.password) delete safeMetadata.password;
    if (safeMetadata.token) delete safeMetadata.token;

    const logEntry = await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        action,
        resource,
        metadata: JSON.stringify(safeMetadata)
      }
    });
    logger.info(`AuditLog [${action}] on [${resource}] by [${userEmail || 'anonymous'}]`);
    return logEntry;
  } catch (err) {
    logger.error('Failed to create audit log entry:', err);
    return null;
  }
}

module.exports = {
  logAuditEvent
};
