/**
 * Zynora Structured Production Logger
 * Logs events in structured format with traceId, userId, module, action, status.
 * Strips sensitive data like passwords, JWTs, and keys.
 */

function sanitizeMeta(meta = {}) {
  if (!meta || typeof meta !== 'object') return meta;
  const sanitized = { ...meta };
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'apiKey', 'jwt'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeMeta(sanitized[key]);
    }
  }
  return sanitized;
}

const logger = {
  log: (level, message, context = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      traceId: context.traceId || null,
      userId: context.userId || null,
      module: context.module || 'SYSTEM',
      action: context.action || null,
      status: context.status || null,
      meta: sanitizeMeta(context.meta || {})
    };

    const formattedPrefix = `[${entry.level}] [${entry.timestamp}] [${entry.module}]${entry.traceId ? ` [trace:${entry.traceId}]` : ''}${entry.userId ? ` [user:${entry.userId}]` : ''}`;
    const extra = Object.keys(entry.meta).length ? JSON.stringify(entry.meta) : '';

    if (level === 'error') {
      console.error(`${formattedPrefix} ${message}`, extra);
    } else if (level === 'warn') {
      console.warn(`${formattedPrefix} ${message}`, extra);
    } else {
      console.log(`${formattedPrefix} ${message}`, extra);
    }

    return entry;
  },

  info: (msg, context = {}) => {
    if (typeof context === 'object' && !context.module && !context.meta && Object.keys(context).length > 0) {
      return logger.log('info', msg, { meta: context });
    }
    return logger.log('info', msg, context);
  },

  warn: (msg, context = {}) => {
    if (typeof context === 'object' && !context.module && !context.meta && Object.keys(context).length > 0) {
      return logger.log('warn', msg, { meta: context });
    }
    return logger.log('warn', msg, context);
  },

  error: (msg, context = {}) => {
    if (typeof context === 'object' && !context.module && !context.meta && Object.keys(context).length > 0) {
      return logger.log('error', msg, { meta: context });
    }
    return logger.log('error', msg, context);
  }
};

module.exports = logger;
