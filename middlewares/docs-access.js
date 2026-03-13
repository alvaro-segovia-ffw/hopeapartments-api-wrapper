'use strict';

const { authenticateAdminOperator } = require('./require-admin-operator');
const { requireAuth } = require('./require-auth');
const { requireRole } = require('./require-role');

const DOCS_ALLOWED_ROLES = ['admin', 'developer', 'client'];

function docsAvailabilityMiddleware(enabled) {
  return (_req, res, next) => {
    if (!enabled) {
      return res.status(404).json({ error: 'NotFound', message: 'Documentation is disabled.' });
    }
    return next();
  };
}

async function requireDocsAccess(req, res, next) {
  const requireDocsRole = requireRole(...DOCS_ALLOWED_ROLES);
  try {
    await authenticateAdminOperator(req);
    return next();
  } catch (_adminErr) {
    return requireAuth(req, res, (authErr) => {
      if (authErr) return next(authErr);
      return requireDocsRole(req, res, next);
    });
  }
}

module.exports = {
  DOCS_ALLOWED_ROLES,
  docsAvailabilityMiddleware,
  requireDocsAccess,
};
