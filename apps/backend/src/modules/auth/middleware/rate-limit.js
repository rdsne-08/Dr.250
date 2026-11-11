import { createHash } from 'node:crypto';

import { query } from '../../../database/pool.js';
import { HttpError } from '../../../middleware/http-error.js';

const POLICIES = {
  login: { account: [10, 15 * 60], address: [300, 15 * 60] },
  register: { account: [3, 60 * 60], address: [120, 60 * 60] },
};
let requestCount = 0;

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function consumeBucket(bucket, limit, windowSeconds, database = undefined) {
  const result = await query(`INSERT INTO private.auth_rate_limits (bucket, attempts, reset_at)
    VALUES ($1, 1, now() + ($2 * interval '1 second'))
    ON CONFLICT (bucket) DO UPDATE SET
      attempts = CASE WHEN private.auth_rate_limits.reset_at <= now() THEN 1
        ELSE private.auth_rate_limits.attempts + 1 END,
      reset_at = CASE WHEN private.auth_rate_limits.reset_at <= now()
        THEN now() + ($2 * interval '1 second') ELSE private.auth_rate_limits.reset_at END
    RETURNING attempts, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - now())))::integer) AS retry_after`,
  [bucket, windowSeconds], database);
  return { allowed: result.rows[0].attempts <= limit, retryAfter: result.rows[0].retry_after };
}

export async function cleanupExpiredBuckets(database = undefined) {
  const result = await query(`DELETE FROM private.auth_rate_limits
    WHERE bucket IN (SELECT bucket FROM private.auth_rate_limits
      WHERE reset_at < now() - interval '1 day' ORDER BY reset_at LIMIT 128)`, [], database);
  return result.rowCount;
}

export function rateLimit(kind, consume = consumeBucket) {
  const policy = POLICIES[kind];
  return async (request, response, next) => {
    try {
      const email = typeof request.body?.email === 'string'
        ? request.body.email.trim().toLowerCase().slice(0, 254) : '';
      // request.ip uses one trusted proxy hop only when explicitly enabled.
      const address = request.ip ?? request.socket.remoteAddress ?? 'unknown';
      const checks = [[`auth:${kind}:ip:${digest(address)}`, ...policy.address]];
      if (email) checks.push([`auth:${kind}:email:${digest(email)}`, ...policy.account]);
      let retryAfter = 0;
      for (const [bucket, limit, window] of checks) {
        const outcome = await consume(bucket, limit, window);
        if (!outcome.allowed) retryAfter = Math.max(retryAfter, outcome.retryAfter);
      }
      if (retryAfter) {
        response.set('Retry-After', String(retryAfter));
        throw new HttpError(429, 'Too many authentication requests. Please try again later.');
      }
      requestCount += 1;
      if (requestCount % 100 === 0) {
        try { await cleanupExpiredBuckets(); }
        catch (error) { console.error('Rate-limit cleanup failed.', { code: error?.code ?? 'UNKNOWN' }); }
      }
      next();
    } catch (error) {
      if (error.statusCode) next(error);
      else next(new HttpError(503, 'Authentication is temporarily unavailable. Please try again later.'));
    }
  };
}
