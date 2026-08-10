// test-auth-token.spec.js
//
// YARA-3551: unit tests for the signed-session-token auth replacing the old
// password-replay pattern. Uses Node's built-in test runner (node:test) —
// no new dependency needed, and the repo already requires Node >=18.
//
// Run with: node --test test-auth-token.spec.js

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-secret-do-not-use-in-prod';
const TEST_CREDENTIALS = JSON.stringify({
  'admin@example.com': require('crypto').createHash('sha256').update('correct-horse-battery-staple').digest('hex'),
});

function mkEvent(overrides = {}) {
  return {
    httpMethod: 'POST',
    headers: {},
    body: '{}',
    ...overrides,
  };
}

// ── verify-session.js ────────────────────────────────────────────────────

test('verifySessionToken', async (t) => {
  process.env.SESSION_TOKEN_SECRET = TEST_SECRET;
  const { verifySessionToken } = require('./netlify/functions/lib/verify-session');

  await t.test('returns null when the header is missing', () => {
    assert.equal(verifySessionToken(undefined), null);
    assert.equal(verifySessionToken(''), null);
  });

  await t.test('returns null when the header has no Bearer prefix', () => {
    assert.equal(verifySessionToken('some-raw-token'), null);
  });

  await t.test('returns null for an empty Bearer token', () => {
    assert.equal(verifySessionToken('Bearer '), null);
  });

  await t.test('returns null for a token signed with a different secret', () => {
    const forged = jwt.sign({ email: 'admin@example.com' }, 'wrong-secret', { expiresIn: '8h' });
    assert.equal(verifySessionToken('Bearer ' + forged), null);
  });

  await t.test('returns null for an expired token', () => {
    const expired = jwt.sign({ email: 'admin@example.com' }, TEST_SECRET, { expiresIn: '-1h' });
    assert.equal(verifySessionToken('Bearer ' + expired), null);
  });

  await t.test('returns the decoded payload for a valid token', () => {
    const token = jwt.sign({ email: 'admin@example.com' }, TEST_SECRET, { expiresIn: '8h' });
    const result = verifySessionToken('Bearer ' + token);
    assert.equal(result.email, 'admin@example.com');
  });

  await t.test('returns null when SESSION_TOKEN_SECRET is not configured', () => {
    const token = jwt.sign({ email: 'admin@example.com' }, TEST_SECRET, { expiresIn: '8h' });
    delete process.env.SESSION_TOKEN_SECRET;
    assert.equal(verifySessionToken('Bearer ' + token), null);
    process.env.SESSION_TOKEN_SECRET = TEST_SECRET; // restore for subsequent tests
  });
});

// ── authenticate.js ──────────────────────────────────────────────────────

test('authenticate.js', async (t) => {
  process.env.AUTH_CREDENTIALS = TEST_CREDENTIALS;
  process.env.SESSION_TOKEN_SECRET = TEST_SECRET;
  const { handler } = require('./netlify/functions/authenticate');

  await t.test('issues a valid, decodable token on successful login', async () => {
    const res = await handler(mkEvent({
      body: JSON.stringify({ email: 'admin@example.com', password: 'correct-horse-battery-staple' }),
    }));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.ok(body.token, 'response must include a token');
    assert.equal(body.password, undefined, 'response must never echo back a password');

    const decoded = jwt.verify(body.token, TEST_SECRET);
    assert.equal(decoded.email, 'admin@example.com');
  });

  await t.test('does not issue a token on wrong password', async () => {
    const res = await handler(mkEvent({
      body: JSON.stringify({ email: 'admin@example.com', password: 'wrong-password' }),
    }));
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.token, undefined);
  });

  await t.test('returns 500 (not a token for an unconfigured secret) when SESSION_TOKEN_SECRET is missing', async () => {
    delete process.env.SESSION_TOKEN_SECRET;
    delete require.cache[require.resolve('./netlify/functions/authenticate')];
    const { handler: handlerNoSecret } = require('./netlify/functions/authenticate');

    const res = await handlerNoSecret(mkEvent({
      body: JSON.stringify({ email: 'admin@example.com', password: 'correct-horse-battery-staple' }),
    }));
    assert.equal(res.statusCode, 500);

    process.env.SESSION_TOKEN_SECRET = TEST_SECRET;
    delete require.cache[require.resolve('./netlify/functions/authenticate')];
  });
});

// ── A protected function's 401 path (no network calls needed to test this) ──

test('protected functions reject requests without a valid token', async (t) => {
  process.env.SESSION_TOKEN_SECRET = TEST_SECRET;
  const { handler } = require('./netlify/functions/get-email-template');

  await t.test('returns 401 with no Authorization header', async () => {
    const res = await handler(mkEvent({ body: JSON.stringify({ templateType: 'invite' }) }));
    assert.equal(res.statusCode, 401);
  });

  await t.test('returns 401 with an invalid token', async () => {
    const res = await handler(mkEvent({
      headers: { authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({ templateType: 'invite' }),
    }));
    assert.equal(res.statusCode, 401);
  });

  await t.test('passes authentication with a valid token (proceeds past the 401 check)', async () => {
    // Stub the module-level `fetch` (node-fetch, required inside
    // get-email-template.js) so this stays a real unit test — no network
    // call — while still proving execution reaches past the auth guard.
    const nodeFetchPath = require.resolve('node-fetch');
    const originalFetch = require.cache[nodeFetchPath] && require.cache[nodeFetchPath].exports;
    require.cache[nodeFetchPath] = {
      id: nodeFetchPath, filename: nodeFetchPath, loaded: true,
      exports: async () => ({ status: 404, ok: false }),
    };
    delete require.cache[require.resolve('./netlify/functions/get-email-template')];
    const { handler: freshHandler } = require('./netlify/functions/get-email-template');

    const token = jwt.sign({ email: 'admin@example.com' }, TEST_SECRET, { expiresIn: '8h' });
    const res = await freshHandler(mkEvent({
      headers: { authorization: 'Bearer ' + token },
      body: JSON.stringify({ templateType: 'invite' }),
    }));

    // Restore the real node-fetch for any later tests/requires.
    if (originalFetch) require.cache[nodeFetchPath].exports = originalFetch;
    else delete require.cache[nodeFetchPath];

    // A 404 from GitHub is handled as "no template saved yet" → 200 with
    // the default template. Proves the token was accepted (not 401) and
    // execution reached the GitHub-fetching logic.
    assert.notEqual(res.statusCode, 401);
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).isDefault, true);
  });
});
