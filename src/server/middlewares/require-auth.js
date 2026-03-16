'use strict';

const { verifyAccessToken } = require('../../../lib/jwt');

function extractBearerToken(req) {
  const header = String(req.header('authorization') || '');
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Bearer token.',
    });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message || 'Invalid access token.',
    });
  }
}

module.exports = {
  extractBearerToken,
  requireAuth,
};
