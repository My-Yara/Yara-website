// submit-early-access.js - Saves early access questionnaire responses (ENCRYPTED)
// Also fires a welcome email via Gmail API on genuinely new signups.

const fetch = require('node-fetch');
const crypto = require('crypto');
const { google } = require('googleapis');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES requires a 16-byte IV

// Gmail welcome email config
const GMAIL_FROM_EMAIL = process.env.GMAIL_FROM_EMAIL || 'hello@my-yara.com';
const GMAIL_FROM_NAME  = process.env.GMAIL_FROM_NAME  || 'Yara';
const WELCOME_TEMPLATE_PATH = 'config/welcome-template.json';

// CORS headers to allow requests from the website
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: 'Method Not Allowed'
        };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: 'Invalid JSON format'
        };
    }

    // Validate required fields
    if (!data.email || !data.financialGoals || !data.rightsProtection || !data.idealOutcome) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Missing required fields' })
        };
    }

    // 1. Get client IP and location
    const clientIp = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';

    // Netlify provides geo data via context.geo (Pro+) or x-nf-geo header
    let city = 'Unknown', region = 'Unknown', country = 'Unknown';
    try {
        if (context && context.geo) {
            city = context.geo.city || 'Unknown';
            region = (context.geo.subdivision && context.geo.subdivision.name) || 'Unknown';
            country = (context.geo.country && context.geo.country.name) || 'Unknown';
        } else if (event.headers['x-nf-geo']) {
            const geo = JSON.parse(decodeURIComponent(event.headers['x-nf-geo']));
            city = geo.city || 'Unknown';
            region = geo.subdivision || geo.region || 'Unknown';
            country = geo.country || 'Unknown';
        }
    } catch (geoErr) {
        console.log('Geo lookup failed:', geoErr.message);
    }

    // Fallback: use free IP geolocation if still unknown
    if (city === 'Unknown' && clientIp !== 'unknown') {
        try {
            const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                city = geoData.city || 'Unknown';
                region = geoData.region || 'Unknown';
                country = geoData.country_name || 'Unknown';
            }
        } catch (e) { /* non-critical */ }
    }

    data.ipAddress = clientIp;
    data.location = `${city}, ${region}, ${country}`;

    const emailPrefix = data.email.replace('@', '_at_');
    const isSurveyUpdate = data.surveyUpdate === true;

    // Check for existing entry by this email to prevent duplicates
    let existingFile = null;
    try {
        const searchUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/early-access?ref=main`;
        const listRes = await fetch(searchUrl, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            }
        });
        if (listRes.ok) {
            const files = await listRes.json();
            // Find the most recent file for this email
            const matches = files
                .filter(f => f.name.startsWith(emailPrefix) && f.name.endsWith('.encrypted'))
                .sort((a, b) => b.name.localeCompare(a.name));
            if (matches.length > 0) {
                existingFile = matches[0];
            }
        }
    } catch (e) {
        console.log('Existing entry check failed (non-critical):', e.message);
    }

    // If this is a plain waitlist signup and an entry already exists, skip (idempotent)
    if (existingFile && !isSurveyUpdate) {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Already signed up!',
                email: data.email
            })
        };
    }

    // Encrypt the response data before saving
    const plaintext = JSON.stringify(data);
    const encryptedContent = encryptData(plaintext, ENCRYPTION_KEY);

    // If survey update with existing entry, overwrite the same file; otherwise create new
    let filename;
    let fileSha;
    let commitMessage;

    if (isSurveyUpdate && existingFile) {
        filename = `early-access/${existingFile.name}`;
        fileSha = existingFile.sha;
        commitMessage = `Survey update for ${data.email}`;
    } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `early-access/${emailPrefix}_${timestamp}.encrypted`;
        fileSha = null;
        commitMessage = `New ENCRYPTED early access signup from ${data.email}`;
    }

    // Prepare GitHub API request
    const contentEncoded = Buffer.from(encryptedContent).toString('base64');
    const githubApiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filename}`;

    const commitData = {
        message: commitMessage,
        content: contentEncoded,
        branch: 'main'
    };
    if (fileSha) {
        commitData.sha = fileSha;
    }

    try {
        const response = await fetch(githubApiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            },
            body: JSON.stringify(commitData)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('GitHub API Error:', errorBody);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Failed to save data to GitHub.', details: errorBody })
            };
        }

        // Send welcome email only on genuinely new signups (not survey updates).
        // Errors are logged but never surface to the user — signup must not fail because of email.
        const isBrandNew = !isSurveyUpdate && !existingFile;
        if (isBrandNew) {
            try {
                await sendWelcomeEmail(data.email);
            } catch (emailErr) {
                console.error('Welcome email failed (non-critical):', emailErr.message);
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: isSurveyUpdate
                    ? 'Survey response updated successfully!'
                    : 'Early access response saved and encrypted successfully!',
                email: data.email
            })
        };

    } catch (error) {
        console.error('Function execution error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Serverless function execution failed.' })
        };
    }
};

/**
 * Encrypts plaintext data using AES-256-CBC.
 * The output includes the IV prepended to the ciphertext.
 */
function encryptData(text, secret) {
    const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted;
}

// ── Welcome email ─────────────────────────────────────────────────────────────
async function sendWelcomeEmail(toEmail) {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.log('GOOGLE_SERVICE_ACCOUNT_JSON not configured — skipping welcome email');
        return;
    }

    let subject = 'Thanks for joining the Yara waitlist';
    let htmlTemplate = buildDefaultWelcomeHtml();

    // Try to load the admin-edited template; fall back to the built-in default.
    try {
        const url = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${WELCOME_TEMPLATE_PATH}?ref=main`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            }
        });
        if (res.ok) {
            const file = await res.json();
            const tpl = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
            if (tpl.subject) subject = tpl.subject;
            if (tpl.html) htmlTemplate = tpl.html;
        }
    } catch (e) {
        console.log('Welcome template load failed, using default:', e.message);
    }

    const firstName = toEmail.split('@')[0].replace(/[._+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const html = htmlTemplate
        .replace(/\{\{email\}\}/g, escapeHtml(toEmail))
        .replace(/\{\{firstName\}\}/g, escapeHtml(firstName))
        .replace(/\{\{appStoreLink\}\}/g, '#');

    await sendViaGmail(toEmail, subject, html);
}

async function sendViaGmail(toEmail, subject, html) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key:   serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: GMAIL_FROM_EMAIL
    });

    const gmail = google.gmail({ version: 'v1', auth });

    const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const message = [
        `From: ${GMAIL_FROM_NAME} <${GMAIL_FROM_EMAIL}>`,
        `To: ${toEmail}`,
        `Subject: ${encodedSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(html).toString('base64')
    ].join('\r\n');

    const raw = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
    });
}

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildDefaultWelcomeHtml() {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:26px;font-weight:700;margin:0;letter-spacing:-0.02em;">You're on the list</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:15px;margin:10px 0 0;">Welcome to Yara, {{firstName}}.</p>
    </div>
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:20px;">
      <p style="color:rgba(255,255,255,0.85);font-size:15px;line-height:1.65;margin:0 0 14px;">
        Thanks for signing up — we're so glad you're here.
      </p>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.65;margin:0;">
        Yara is your personal AI advocate for your finances. We're letting people in carefully so we can give every early member real attention. We'll email you the moment your spot opens up.
      </p>
    </div>
    <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:10px;padding:18px 20px;margin-bottom:24px;">
      <p style="color:#a78bfa;font-size:12px;font-weight:600;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.04em;">One small favor</p>
      <p style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.6;margin:0;">
        Add <strong style="color:rgba(255,255,255,0.9);">hello@my-yara.com</strong> to your contacts so our invite email lands in your inbox, not spam.
      </p>
    </div>
    <div style="text-align:center;padding-top:8px;">
      <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin:0 0 6px;">Questions? Just reply to this email.</p>
      <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">— The Yara team</p>
    </div>
    <div style="text-align:center;padding-top:24px;margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
        Yara — Your Personal AI Advocate &bull;
        <a href="https://my-yara.com" style="color:rgba(139,92,246,0.6);text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
