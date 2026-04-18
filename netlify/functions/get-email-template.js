// get-email-template.js — Reads the admin-editable email template from GitHub
// Supports two templates via `templateType` body field: 'invite' (default) and 'welcome'.

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

const TEMPLATE_FILES = {
    invite: 'config/email-template.json',
    welcome: 'config/welcome-template.json'
};

const WELCOME_HTML_DEFAULT = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FDFCFF;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:16px;">
      <img src="https://www.my-yara.com/yara_butterfly.png" alt="Yara" width="40" height="40" style="width:40px;height:40px;" />
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#1A1A2E;font-size:26px;font-weight:800;margin:0;letter-spacing:-0.03em;">You're on the list.</h1>
      <p style="color:#4A4A68;font-size:15px;margin:10px 0 0;font-weight:400;">Welcome.</p>
    </div>

    <div style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.07);border-radius:20px;padding:24px;margin-bottom:20px;">
      <p style="color:#1A1A2E;font-size:15px;line-height:1.65;margin:0 0 14px;">
        Thanks for signing up. We're glad you're here.
      </p>
      <p style="color:#4A4A68;font-size:14px;line-height:1.65;margin:0;">
        Yara is an AI advocate that fights to save you money. She analyzes your bills, finds overcharges and better deals, then takes action: negotiating with providers, switching plans, and cancelling services you don't need. No more sitting on hold.
      </p>
    </div>

    <div style="background:linear-gradient(135deg,rgba(108,58,237,0.08),rgba(167,139,250,0.05));border:1px solid rgba(108,58,237,0.2);border-radius:20px;padding:24px;margin-bottom:20px;text-align:center;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.1em;">A thank-you for joining early</p>
      <p style="color:#1A1A2E;font-size:20px;font-weight:800;margin:0 0 10px;line-height:1.3;letter-spacing:-0.02em;">6 months of Yara, free on us</p>
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0;">
        No card up front. No fine print. Yours when we open your spot.
      </p>
    </div>

    <div style="color:#4A4A68;font-size:14px;line-height:1.65;margin-bottom:20px;padding:0 4px;">
      <p style="margin:0;">
        We're letting people in carefully so she can give every early member real attention. We don't have a fixed date yet, but when your invite arrives, you'll get a private App Store link and be up and running in minutes.
      </p>
    </div>

    <div style="background:rgba(108,58,237,0.05);border:1px solid rgba(108,58,237,0.12);border-radius:14px;padding:18px 20px;margin-bottom:24px;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">One small favor</p>
      <p style="color:#4A4A68;font-size:13px;line-height:1.6;margin:0;">
        Add <strong style="color:#1A1A2E;">hello@my-yara.com</strong> to your contacts so our invite lands in your inbox, not spam.
      </p>
    </div>

    <div style="text-align:center;padding-top:8px;">
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0 0 6px;">
        Questions? Just reply. We read every message.
      </p>
      <p style="color:#8888A4;font-size:13px;margin:0;">
        - The Yara team
      </p>
    </div>

    <div style="text-align:center;padding-top:24px;margin-top:24px;border-top:1px solid rgba(0,0,0,0.06);">
      <p style="color:rgba(26,26,46,0.3);font-size:11px;margin:0;">
        Yara | Optimize Every Dollar. Protect Every Right.<br>
        <a href="https://my-yara.com" style="color:#6C3AED;text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_TEMPLATES = {
    invite: {
        subject: "You're approved for Yara Early Access",
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FDFCFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#1A1A2E;font-size:24px;font-weight:700;margin:0;">Welcome to Yara</h1>
      <p style="color:#8888A4;font-size:14px;margin:8px 0 0;">You're in. Early access is yours.</p>
    </div>

    <div style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#1A1A2E;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Your early access request has been approved. You can now download Yara directly from the App Store.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{appStoreLink}}" style="display:inline-block;background:linear-gradient(135deg,#6C3AED,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:600;">
          Download Yara
        </a>
      </div>
      <p style="color:#8888A4;font-size:13px;line-height:1.5;margin:16px 0 0;">
        Open this link on your iPhone to install. The app is available exclusively to early access members like you.
      </p>
    </div>

    <div style="background:rgba(108,58,237,0.05);border:1px solid rgba(108,58,237,0.12);border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="color:#6C3AED;font-size:13px;font-weight:600;margin:0 0 8px;">Getting started</p>
      <ul style="color:#4A4A68;font-size:13px;line-height:1.8;margin:0;padding:0 0 0 18px;">
        <li>Open Yara and sign in with <strong style="color:#1A1A2E;">{{email}}</strong></li>
        <li>Connect a bank account to unlock financial insights</li>
        <li>Ask Yara anything about your bills, subscriptions, or spending</li>
        <li>Share feedback directly in the app. We read every message</li>
      </ul>
    </div>

    <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(0,0,0,0.06);">
      <p style="color:rgba(26,26,46,0.3);font-size:11px;margin:0;">
        Yara | Your Personal AI Advocate<br>
        <a href="https://my-yara.com" style="color:#6C3AED;text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
    },
    welcome: {
        subject: "Thanks for joining the Yara waitlist",
        html: WELCOME_HTML_DEFAULT
    }
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

    if (!AUTH_CREDENTIALS) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Auth not configured' }) };
    }
    const credentials = JSON.parse(AUTH_CREDENTIALS);
    const hashedPassword = crypto.createHash('sha256').update(body.password || '').digest('hex');
    if (!credentials[body.email] || credentials[body.email] !== hashedPassword) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    const templateType = (body.templateType === 'welcome') ? 'welcome' : 'invite';
    const filePath = TEMPLATE_FILES[templateType];
    const defaultTemplate = DEFAULT_TEMPLATES[templateType];

    try {
        const url = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filePath}?ref=main`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            }
        });

        if (res.status === 404) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ ...defaultTemplate, templateType, isDefault: true })
            };
        }

        if (!res.ok) throw new Error('GitHub API error: ' + res.status);

        const file = await res.json();
        const template = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ ...template, templateType, sha: file.sha, isDefault: false })
        };

    } catch (err) {
        console.error('get-email-template error:', err);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ ...defaultTemplate, templateType, isDefault: true, error: err.message })
        };
    }
};
