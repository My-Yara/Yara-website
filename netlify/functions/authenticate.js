// authenticate.js - Server-side authentication for executive survey access

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Load authorized credentials from environment variable
// Format: {"email@example.com": "hashed_password", ...}
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;

// YARA-3551: session tokens are short-lived and signed with a secret
// separate from AUTH_CREDENTIALS. Must be provisioned in the deployment
// environment — there is no safe default.
const SESSION_TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET;
const SESSION_TOKEN_TTL = '8h';

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

    // Only accept POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    let requestData;
    try {
        requestData = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid JSON format' })
        };
    }

    const { email, password } = requestData;

    // Validate input
    if (!email || !password) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Email and password are required' })
        };
    }

    // Check if AUTH_CREDENTIALS is configured
    if (!AUTH_CREDENTIALS) {
        console.error('AUTH_CREDENTIALS environment variable not set');
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Authentication system not configured' })
        };
    }

    let credentials;
    try {
        credentials = JSON.parse(AUTH_CREDENTIALS);
    } catch (error) {
        console.error('Failed to parse AUTH_CREDENTIALS:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Authentication configuration error' })
        };
    }

    // Hash the provided password
    const hashedPassword = hashPassword(password);

    // Check if email exists and password matches
    if (credentials[email] && credentials[email] === hashedPassword) {
        if (!SESSION_TOKEN_SECRET) {
            console.error('SESSION_TOKEN_SECRET environment variable not set');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Authentication system not configured' })
            };
        }

        // YARA-3551: issue a short-lived signed session token instead of
        // letting the client hold onto (and replay) the raw password.
        const token = jwt.sign({ email }, SESSION_TOKEN_SECRET, { expiresIn: SESSION_TOKEN_TTL });

        // Authentication successful
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Authentication successful',
                userId: email,
                token,
                timestamp: new Date().toISOString()
            })
        };
    } else {
        // Authentication failed
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                message: 'Invalid email or password'
            })
        };
    }
};

/**
 * Hashes password using SHA-256
 * Returns hex string of the hash
 */
function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
}
