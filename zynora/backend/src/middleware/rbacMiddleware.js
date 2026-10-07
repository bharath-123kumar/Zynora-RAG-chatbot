function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: `Access forbidden: Requires ${requiredRole} role` });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireAdmin: requireRole('ADMIN')
};
