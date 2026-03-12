'use strict';

const { isDatabaseConfigured, query } = require('./db');

async function writeAuditLog(entry) {
  if (!isDatabaseConfigured()) return null;

  const sql = `
    insert into audit_logs (
      actor_user_id,
      actor_api_key_id,
      action,
      resource_type,
      resource_id,
      ip,
      user_agent,
      metadata
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    returning id, created_at
  `;

  const params = [
    entry.actorUserId || null,
    entry.actorApiKeyId || null,
    String(entry.action || '').trim(),
    entry.resourceType ? String(entry.resourceType) : null,
    entry.resourceId ? String(entry.resourceId) : null,
    entry.ip ? String(entry.ip) : null,
    entry.userAgent ? String(entry.userAgent) : null,
    JSON.stringify(entry.metadata || {}),
  ];

  if (!params[2]) {
    throw new Error('Audit action is required.');
  }

  const result = await query(sql, params);
  return result.rows[0] || null;
}

module.exports = {
  writeAuditLog,
};
