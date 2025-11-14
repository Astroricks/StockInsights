import { errorResponse } from './utils/response.js';

const getUserId = (event) => {
  const jwtSubject = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (jwtSubject) return jwtSubject;

  const iamUser = event.requestContext?.authorizer?.claims?.sub;
  if (iamUser) return iamUser;

  const headerUser = event.headers?.['x-user-id'] ?? event.headers?.['X-User-Id'];
  if (headerUser) return headerUser;

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
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-User-Id',
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
 * Returns 202 Accepted immediately
 */
const handleSearch = async (event) => {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized request');
  }

  const { symbol, userName, userEmail } = getBody(event);
  if (!symbol) {
    return errorResponse(400, 'Missing "symbol" in request body');
  }

  // Log to CloudWatch (structured logging for easy querying)
  console.log(JSON.stringify({
    event: 'stock_search',
    userId,
    userName: userName || 'N/A',
    userEmail: userEmail || 'N/A',
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
