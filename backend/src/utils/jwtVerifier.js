import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Auth0 domain - should be set as environment variable
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'dev-qq0v6g1jo31z8gcr.us.auth0.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || 'TT9guu2A2W8zgIZZKAgFZc0TB9JHekst';
const AUTH0_ISSUER = `https://${AUTH0_DOMAIN}/`;

// Create JWKS client to fetch Auth0's public keys
const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

/**
 * Get the signing key from Auth0's JWKS endpoint
 */
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

/**
 * Verify and decode JWT token from Auth0
 * @param {string} token - JWT token string
 * @returns {Promise<Object|null>} Decoded token payload or null if verification fails
 */
export const verifyJwt = (token) => {
  return new Promise((resolve) => {
    if (!token) {
      resolve(null);
      return;
    }

    jwt.verify(
      token,
      getKey,
      {
        audience: AUTH0_CLIENT_ID, // ID tokens have client ID as audience
        issuer: AUTH0_ISSUER,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          console.warn('[JWT] Verification failed:', err.message);
          resolve(null);
          return;
        }
        resolve(decoded);
      }
    );
  });
};

/**
 * Decode JWT without verification (for debugging only)
 * @param {string} token - JWT token string
 * @returns {Object|null} Decoded token payload or null
 */
export const decodeJwtUnverified = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode payload (base64url)
    const payload = parts[1];
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('[JWT] Decode failed:', error.message);
    return null;
  }
};

