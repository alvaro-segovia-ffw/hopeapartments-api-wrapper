'use strict';

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const roles = Array.isArray(req.auth?.roles) ? req.auth.roles : [];
    const allowed = allowedRoles.some((role) => roles.includes(role));

    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient role.',
      });
    }

    return next();
  };
}

module.exports = { requireRole };
