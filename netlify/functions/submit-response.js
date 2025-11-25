// submit-response.js: ENCRYPTED VERSION

const fetch = require('node-fetch');
const crypto = require('crypto');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES requires a 16-byte IV

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

    // 1. Encrypt the response data before saving
    const plaintext = JSON.stringify(data);
    const encryptedContent = encryptData(plaintext, ENCRYPTION_KEY);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Save as .encrypted file to signal it's encrypted
    const filename = `responses/${data.userId}_${timestamp}.encrypted`;

    // 2. Prepare GitHub API request
    const contentEncoded = Buffer.from(encryptedContent).toString('base64');
    const githubApiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filename}`;

    const commitData = {
        message: `New ENCRYPTED response from user ${data.userId}`,
        content: contentEncoded,
        branch: 'main'
    };

    // [... TRUNCATED: SAME GITHUB API FETCH CODE AS BEFORE ...]
    // (Ensure you replace this comment with the fetch/PUT request code from the previous response)

    try {
        const response = await fetch(githubApiUrl, {
            method: 'PUT',
            // ... rest of headers and body from previous response ...
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            },
            body: JSON.stringify(commitData)
        });

        if (!response.ok) {
            // ... error handling ...
            const errorBody = await response.json();
            console.error('GitHub API Error:', errorBody);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Failed to save data to GitHub.', details: errorBody })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Response saved and encrypted successfully!' })
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
