// save-email-template.js — Persists the admin-edited email template to GitHub
// Supports two templates via `templateType` body field: 'invite' (default) and 'welcome'.

const fetch = require('node-fetch');
const { verifySessionToken } = require('./lib/verify-session');

const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';

const TEMPLATE_FILES = {
    invite: 'config/email-template.json',
    welcome: 'config/welcome-template.json'
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

    // Authenticate admin — YARA-3551: verify the session token issued by
    // authenticate.js instead of re-checking a replayed password. The
    // admin's identity comes from the verified token, not a client-supplied
    // email field, so it can't be spoofed independently of the token.
    const session = verifySessionToken(event.headers.authorization || event.headers.Authorization);
    if (!session) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }
    const adminEmail = session.email;

    const { subject, html, sha, fields } = body;
    if (!subject || !html) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'subject and html are required' }) };
    }

    const templateType = (body.templateType === 'welcome') ? 'welcome' : 'invite';
    const filePath = TEMPLATE_FILES[templateType];

    const template = { subject, html, updatedAt: new Date().toISOString(), updatedBy: adminEmail };
    // fields are optional — only present when the user has edited in Form mode at least once.
    // Storing them lets Form mode reopen with the same values next time.
    if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
        template.fields = fields;
    }
    const contentEncoded = Buffer.from(JSON.stringify(template, null, 2)).toString('base64');

    const commitBody = {
        message: `Update ${templateType} email template (by ${adminEmail})`,
        content: contentEncoded,
        branch: 'main'
    };
    // If we have the current file's sha, include it for an update; otherwise GitHub creates the file
    if (sha) commitBody.sha = sha;

    try {
        const url = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filePath}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            },
            body: JSON.stringify(commitBody)
        });

        if (!res.ok) {
            const err = await res.json();
            console.error('GitHub save error:', err);
            return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Failed to save template', details: err }) };
        }

        const result = await res.json();
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Template saved', sha: result.content.sha })
        };

    } catch (err) {
        console.error('save-email-template error:', err);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: err.message }) };
    }
};
