// verify-session.js — shared session-token verification for admin endpoints.
//
// YARA-3551: replaces the old pattern of re-checking {email, password} (or
// {adminEmail, adminPassword}) on every admin request. authenticate.js now
// issues a short-lived signed JWT on login; every other admin function
// verifies that token instead of ever seeing the password again.
//
// Not a Netlify function itself (no exports.handler) — lives in a
// subdirectory of netlify/functions/ so it isn't picked up as an endpoint,
// while still being importable via a plain relative require() from sibling
// function files.

const jwt = require('jsonwebtoken');

/**
 * Verifies the `Authorization: Bearer <token>` header from a Netlify
 * function event. Returns the decoded payload ({ email, iat, exp }) on
 * success, or null on any failure (missing header, malformed header,
 * invalid signature, expired token).
 */
function verifySessionToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const secret = process.env.SESSION_TOKEN_SECRET;
  if (!secret) {
    console.error('SESSION_TOKEN_SECRET environment variable not set');
    return null;
  }

  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

module.exports = { verifySessionToken };
