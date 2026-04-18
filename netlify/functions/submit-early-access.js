// submit-early-access.js - Saves early access questionnaire responses (ENCRYPTED)
// Also fires a welcome email via Resend on genuinely new signups.

const fetch = require('node-fetch');
const crypto = require('crypto');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES requires a 16-byte IV

// Email config — Resend
// EMAIL_FROM / EMAIL_FROM_NAME are the canonical names; older GMAIL_* vars work as fallback.
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.GMAIL_FROM_EMAIL || 'hello@my-yara.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || process.env.GMAIL_FROM_NAME || 'Yara';
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
    if (!process.env.RESEND_API_KEY) {
        console.log('RESEND_API_KEY not configured — skipping welcome email');
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

    await sendViaResend(toEmail, subject, html);
}

async function sendViaResend(toEmail, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
            to: toEmail,
            subject,
            html
        })
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown');
        throw new Error(`Resend ${res.status}: ${errText}`);
    }
}

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildDefaultWelcomeHtml() {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FDFCFF;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#1A1A2E;font-size:26px;font-weight:800;margin:0;letter-spacing:-0.03em;">You're on the list.</h1>
      <p style="color:#4A4A68;font-size:15px;margin:10px 0 0;font-weight:400;">Welcome.</p>
    </div>
    <div style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.07);border-radius:20px;padding:24px;margin-bottom:20px;">
      <p style="color:#1A1A2E;font-size:15px;line-height:1.65;margin:0 0 14px;">
        Thanks for signing up — we're glad you're here.
      </p>
      <p style="color:#4A4A68;font-size:14px;line-height:1.65;margin:0;">
        Yara is an AI advocate that fights to save you money. She analyzes your bills, finds overcharges and better deals, then takes action — negotiating with providers, switching plans, and cancelling services you don't need. No more sitting on hold.
      </p>
    </div>
    <div style="background:linear-gradient(135deg,rgba(108,58,237,0.08),rgba(167,139,250,0.05));border:1px solid rgba(108,58,237,0.2);border-radius:20px;padding:24px;margin-bottom:20px;text-align:center;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.1em;">A thank-you for joining early</p>
      <p style="color:#1A1A2E;font-size:20px;font-weight:800;margin:0 0 10px;line-height:1.3;letter-spacing:-0.02em;">6 months of Yara, free on us</p>
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0;">No card up front. No fine print. Yours when we open your spot.</p>
    </div>
    <div style="color:#4A4A68;font-size:14px;line-height:1.65;margin-bottom:20px;padding:0 4px;">
      <p style="margin:0;">We're letting people in carefully so she can give every early member real attention. We don't have a fixed date yet — but when your invite arrives, you'll get a private App Store link and be up and running in minutes.</p>
    </div>
    <div style="background:rgba(108,58,237,0.05);border:1px solid rgba(108,58,237,0.12);border-radius:14px;padding:18px 20px;margin-bottom:24px;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">One small favor</p>
      <p style="color:#4A4A68;font-size:13px;line-height:1.6;margin:0;">Add <strong style="color:#1A1A2E;">hello@my-yara.com</strong> to your contacts so our invite lands in your inbox, not spam.</p>
    </div>
    <div style="text-align:center;padding-top:8px;">
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0 0 6px;">Questions? Just reply — we read every message.</p>
      <p style="color:#8888A4;font-size:13px;margin:0;">— The Yara team</p>
    </div>
    <div style="text-align:center;padding-top:24px;margin-top:24px;border-top:1px solid rgba(0,0,0,0.06);">
      <p style="color:rgba(26,26,46,0.3);font-size:11px;margin:0;">Yara — Optimize Every Dollar. Protect Every Right.<br><a href="https://my-yara.com" style="color:#6C3AED;text-decoration:none;">my-yara.com</a></p>
    </div>
  </div>
</body>
</html>`;
}
