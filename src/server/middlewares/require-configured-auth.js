'use strict';

const { isAuthConfigured } = require('../../../lib/auth-service');

function requireConfiguredAuth(_req, res, next) {
  if (!isAuthConfigured()) {
    return res.status(503).json({
      error: 'AuthNotConfigured',
      message: 'Auth requires DATABASE_URL and JWT_ACCESS_SECRET.',
    });
  }

  return next();
}

module.exports = { requireConfiguredAuth };
