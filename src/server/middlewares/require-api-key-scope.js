'use strict';

const { buildApiKeyScopeDeniedAuditEntry } = require('../audit/audit-recorder');
const { writeAuditLog } = require('../../../lib/audit-service');
const { PublicError } = require('../errors/public-error');

function getApiKeyScopes(req) {
  if (Array.isArray(req.apiKey?.scopes)) return req.apiKey.scopes;
  if (Array.isArray(req.authActor?.scopes)) return req.authActor.scopes;
  return [];
}

function hasRequiredScope(req, requiredScope) {
  return getApiKeyScopes(req).includes(requiredScope);
}

function requireApiKeyScope(requiredScope, options = {}) {
  const auditLogWriter = options.auditLogWriter || writeAuditLog;

  return async function requireApiKeyScopeMiddleware(req, _res, next) {
    if (!req.apiKey && !req.authActor) {
      return next(
        new PublicError({
          statusCode: 500,
          code: 'API_KEY_SCOPE_MIDDLEWARE_MISCONFIGURED',
          message: 'Internal server error',
        })
      );
    }

    if (hasRequiredScope(req, requiredScope)) return next();

    try {
      await auditLogWriter(buildApiKeyScopeDeniedAuditEntry(req, requiredScope));
    } catch (_err) {
      // Scope enforcement should not fail open or break requests because audit persistence failed.
    }

    return next(
      new PublicError({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: `Missing required API key scope: ${requiredScope}.`,
      })
    );
  };
}

module.exports = {
  requireApiKeyScope,
  _test: {
    buildScopeAuditEntry: buildApiKeyScopeDeniedAuditEntry,
    getApiKeyScopes,
    hasRequiredScope,
  },
};
