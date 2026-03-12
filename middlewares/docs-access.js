'use strict';

const { extractBearerToken, requireAuth } = require('./require-auth');
const { requireRole } = require('./require-role');
const { safeCompare } = require('../lib/safe-compare');

const DOCS_ALLOWED_ROLES = ['admin', 'developer', 'client'];

function docsAvailabilityMiddleware(enabled) {
  return (_req, res, next) => {
    if (!enabled) {
      return res.status(404).json({ error: 'NotFound', message: 'Documentation is disabled.' });
    }
    return next();
  };
}

function docsBasicAuthMiddleware({ enabled, username, password }) {
  return (req, res, next) => {
    if (!enabled) return next();

    const header = String(req.header('authorization') || '');
    if (!header.startsWith('Basic ')) {
      res.setHeader('www-authenticate', 'Basic realm="Hope Apartments Docs"');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Basic Authorization header.',
      });
    }

    let decoded = '';
    try {
      decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    } catch (_err) {
      res.setHeader('www-authenticate', 'Basic realm="Hope Apartments Docs"');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Basic Authorization header.',
      });
    }

    const separatorIndex = decoded.indexOf(':');
    const requestUsername = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
    const requestPassword = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';

    if (!safeCompare(requestUsername, username) || !safeCompare(requestPassword, password)) {
      res.setHeader('www-authenticate', 'Basic realm="Hope Apartments Docs"');
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid docs credentials.' });
    }

    return next();
  };
}

function docsJwtOrBasicAuthMiddleware({ basicAuthEnabled, basicAuthUser, basicAuthPassword }) {
  const requireDocsRole = requireRole(...DOCS_ALLOWED_ROLES);
  const requireBasicAuth = docsBasicAuthMiddleware({
    enabled: basicAuthEnabled,
    username: basicAuthUser,
    password: basicAuthPassword,
  });

  return (req, res, next) => {
    if (extractBearerToken(req)) {
      return requireAuth(req, res, (authErr) => {
        if (authErr) return next(authErr);
        return requireDocsRole(req, res, next);
      });
    }

    return requireBasicAuth(req, res, next);
  };
}

module.exports = {
  DOCS_ALLOWED_ROLES,
  docsAvailabilityMiddleware,
  docsBasicAuthMiddleware,
  docsJwtOrBasicAuthMiddleware,
};
