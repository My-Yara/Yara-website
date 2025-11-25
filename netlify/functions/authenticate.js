// authenticate.js - Server-side authentication for executive survey access

const crypto = require('crypto');

// Load authorized credentials from environment variable
// Format: {"email@example.com": "hashed_password", ...}
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;

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
        // Authentication successful
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Authentication successful',
                userId: email,
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
