// get-email-template.js — Reads the admin-editable email template from GitHub

const fetch = require('node-fetch');
const crypto = require('crypto');

const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const DEFAULT_TEMPLATE = {
    subject: "You're approved for Yara Early Access",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0;">Welcome to Yara</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:8px 0 0;">You're in. Early access is yours.</p>
    </div>

    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;margin:0 0 16px;">
        Your early access request has been approved. You can now download Yara directly from the App Store.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{appStoreLink}}" style="display:inline-block;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;">
          Download Yara
        </a>
      </div>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.5;margin:16px 0 0;">
        Open this link on your iPhone to install. The app is available exclusively to early access members like you.
      </p>
    </div>

    <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="color:#8B5CF6;font-size:13px;font-weight:600;margin:0 0 8px;">Getting started</p>
      <ul style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.8;margin:0;padding:0 0 0 18px;">
        <li>Open Yara and sign in with <strong style="color:rgba(255,255,255,0.8);">{{email}}</strong></li>
        <li>Connect a bank account to unlock financial insights</li>
        <li>Ask Yara anything about your bills, subscriptions, or spending</li>
        <li>Share feedback directly in the app — we read every message</li>
      </ul>
    </div>

    <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
        Yara — Your Personal AI Advocate<br>
        <a href="https://my-yara.com" style="color:rgba(139,92,246,0.6);text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
    }

    let body;
    try { body = JSON.parse(event.body); } catch {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'Invalid JSON' }) };
    }

    // Authenticate admin
    if (!AUTH_CREDENTIALS) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Auth not configured' }) };
    }
    const credentials = JSON.parse(AUTH_CREDENTIALS);
    const hashedPassword = crypto.createHash('sha256').update(body.password || '').digest('hex');
    if (!credentials[body.email] || credentials[body.email] !== hashedPassword) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    // Fetch template from GitHub
    try {
        const url = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/config/email-template.json?ref=main`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            }
        });

        if (res.status === 404) {
            // No saved template yet — return default
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ ...DEFAULT_TEMPLATE, isDefault: true })
            };
        }

        if (!res.ok) throw new Error('GitHub API error: ' + res.status);

        const file = await res.json();
        const template = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ ...template, sha: file.sha, isDefault: false })
        };

    } catch (err) {
        console.error('get-email-template error:', err);
        // Fall back to default on any error so the editor still loads
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ ...DEFAULT_TEMPLATE, isDefault: true, error: err.message })
        };
    }
};
