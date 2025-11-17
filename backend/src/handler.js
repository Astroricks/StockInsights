import { errorResponse } from './utils/response.js';

/**
 * Extract JWT token from Authorization header
 */
const getJwtToken = (event) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Decode JWT token (without verification for now)
 * In production, you should verify the token signature
 */
const decodeJwt = (token) => {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode payload (base64url)
    const payload = parts[1];
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('[Handler] Failed to decode JWT:', error.message);
    return null;
  }
};

/**
 * Extract user info from JWT token
 */
const getUserInfoFromJwt = (event) => {
  // Try API Gateway authorizer first (if JWT authorizer is configured)
  const jwtClaims = event.requestContext?.authorizer?.jwt?.claims;
  if (jwtClaims) {
    return {
      userId: jwtClaims.sub,
      userName: jwtClaims.name || jwtClaims['https://prismfininsights.com/name'] || null,
      userEmail: jwtClaims.email || jwtClaims['https://prismfininsights.com/email'] || null,
    };
  }
  
  // Fallback: Extract from Authorization header
  const token = getJwtToken(event);
  if (token) {
    const decoded = decodeJwt(token);
    if (decoded) {
      // Try different possible claim names for user ID
      const userId = decoded.sub || decoded.user_id || decoded.azp || decoded.client_id;
      if (userId) {
        return {
          userId: userId,
          userName: decoded.name || decoded['https://prismfininsights.com/name'] || decoded.nickname || null,
          userEmail: decoded.email || decoded['https://prismfininsights.com/email'] || null,
        };
      }
    }
  }
  
  // Legacy: Try X-User-Id header (for backward compatibility)
  const headerUser = event.headers?.['x-user-id'] ?? event.headers?.['X-User-Id'];
  if (headerUser) {
    return {
      userId: headerUser,
      userName: null,
      userEmail: null,
    };
  }
  
  return null;
};

const getBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
};

const handleCorsPreflight = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }
  return null;
};

/**
 * POST /stocks/search
 * Log user's search behavior to CloudWatch Logs
 * Returns 204 No Content immediately
 */
const handleSearch = async (event) => {
  // Extract user info from JWT token
  const userInfo = getUserInfoFromJwt(event);
  
  if (!userInfo || !userInfo.userId) {
    return errorResponse(401, 'Unauthorized request - valid JWT token required');
  }

  const { symbol } = getBody(event);
  if (!symbol) {
    return errorResponse(400, 'Missing "symbol" in request body');
  }

  // Log to CloudWatch (structured logging for easy querying)
  // User info is extracted from JWT token, not from request body
  console.log(JSON.stringify({
    event: 'stock_search',
    userId: userInfo.userId,
    userName: userInfo.userName || 'N/A',
    userEmail: userInfo.userEmail || 'N/A',
    symbol: symbol.toUpperCase(),
    timestamp: new Date().toISOString(),
    requestId: event.requestContext?.requestId,
  }));

  // Return immediately
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: '',
  };
};

export const handler = async (event) => {
  try {
    const cors = handleCorsPreflight(event);
    if (cors) return cors;

    const { resource, httpMethod, path } = event;
    const normalizedPath = resource ?? path;

    // Search logging endpoint
    if (httpMethod === 'POST' && normalizedPath === '/stocks/search') {
      return await handleSearch(event);
    }

    return errorResponse(404, `Route ${httpMethod} ${normalizedPath} not found`);
  } catch (error) {
    console.error('[Handler] Unexpected error', error);
    return errorResponse(500, 'Internal server error', {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    });
  }
};
