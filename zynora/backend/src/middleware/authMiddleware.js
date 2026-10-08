const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// In production, JWT_SECRET MUST come from the environment variable.
// A hardcoded fallback is only allowed in development to ease local setup.
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start in production.');
    process.exit(1);
  }
  console.warn('[WARN] JWT_SECRET not set — using insecure development fallback. Set JWT_SECRET in your environment.');
  return 'zynora_dev_only_jwt_secret_do_not_use_in_production';
})();

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
