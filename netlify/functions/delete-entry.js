// delete-entry.js - Deletes a waitlist entry from GitHub

const fetch = require('node-fetch');
const crypto = require('crypto');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
    }

    let requestData;
    try {
        requestData = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, headers: corsHeaders, body: 'Invalid JSON' };
    }

    const { adminEmail, adminPassword, userEmail, filename, sha } = requestData;

    // 1. Authenticate admin
    if (!AUTH_CREDENTIALS) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Auth not configured' }) };
    }

    const credentials = JSON.parse(AUTH_CREDENTIALS);
    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');

    if (!credentials[adminEmail] || credentials[adminEmail] !== hashedPassword) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    // 2. Delete file from GitHub
    try {
        const filePath = filename.includes('/') ? filename : `early-access/${filename}`;
        const githubUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filePath}`;

        const deleteResponse = await fetch(githubUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            },
            body: JSON.stringify({
                message: `Deleted waitlist entry: ${userEmail}`,
                sha: sha,
                branch: 'main'
            })
        });

        if (!deleteResponse.ok) {
            const errBody = await deleteResponse.json();
            console.error('GitHub delete error:', errBody);
            return {
                statusCode: deleteResponse.status,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Failed to delete', details: errBody })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Entry deleted successfully', email: userEmail })
        };

    } catch (error) {
        console.error('Delete error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message })
        };
    }
};
