'use strict';

const { extractApiKey, requireApiKey } = require('./require-api-key');

function requireLegacyOrApiKeyAuth(legacyAuthMiddleware) {
  return async (req, res, next) => {
    if (extractApiKey(req)) {
      return requireApiKey(req, res, next);
    }

    return legacyAuthMiddleware(req, res, next);
  };
}

module.exports = { requireLegacyOrApiKeyAuth };
