// save-email-template.js — Persists the admin-edited email template to GitHub

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

    const { subject, html, sha } = body;
    if (!subject || !html) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'subject and html are required' }) };
    }

    const template = { subject, html, updatedAt: new Date().toISOString(), updatedBy: body.email };
    const contentEncoded = Buffer.from(JSON.stringify(template, null, 2)).toString('base64');

    const commitBody = {
        message: `Update email template (by ${body.email})`,
        content: contentEncoded,
        branch: 'main'
    };
    // If we have the current file's sha, include it for an update; otherwise GitHub creates the file
    if (sha) commitBody.sha = sha;

    try {
        const url = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/config/email-template.json`;
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
