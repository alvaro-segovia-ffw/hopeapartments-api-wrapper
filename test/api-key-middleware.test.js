'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { requireLegacyOrApiKeyAuth } = require('../middlewares/require-legacy-or-api-key-auth');

function createResponseDouble() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

test('requireLegacyOrApiKeyAuth falls back to legacy auth when no X-API-Key is present', async () => {
  const req = {
    header(name) {
      return name.toLowerCase() === 'x-api-key' ? '' : '';
    },
  };
  const res = createResponseDouble();
  let legacyCalled = false;

  const middleware = requireLegacyOrApiKeyAuth((_req, _res, next) => {
    legacyCalled = true;
    next();
  });

  await middleware(req, res, () => {});

  assert.equal(legacyCalled, true);
});
