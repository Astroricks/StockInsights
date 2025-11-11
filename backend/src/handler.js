import { initializeApiKey, fetchAllFinancialData, clearCachedData } from './services/alphaVantage.js';
import { getAlphaVantageKey } from './services/secrets.js';
import { enforceRateLimit, RateLimitError, getQuota } from './services/rateLimiter.js';
import { errorResponse, jsonResponse, successResponse } from './utils/response.js';

const CACHE_CONTROL_HEADER = { 'Cache-Control': 'public, max-age=300, s-maxage=300' };
const ALLOW_ANONYMOUS = process.env.ALLOW_ANONYMOUS_LOCAL === 'true';

const getUserId = (event) => {
  const jwtSubject = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (jwtSubject) return jwtSubject;

  const iamUser = event.requestContext?.authorizer?.claims?.sub;
  if (iamUser) return iamUser;

  const headerUser = event.headers?.['x-user-id'] ?? event.headers?.['X-User-Id'];
  if (headerUser) return headerUser;

  if (ALLOW_ANONYMOUS) {
    return 'local-user';
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

let lastApiKeyInit = 0;
const API_KEY_TTL = Number(process.env.API_KEY_CACHE_TTL_MS ?? 300_000);

const ensureApiKeyLoaded = async () => {
  const currentTime = Date.now();
  if ((currentTime - lastApiKeyInit) < API_KEY_TTL) {
    return;
  }

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    initializeApiKey(process.env.ALPHA_VANTAGE_API_KEY);
    lastApiKeyInit = currentTime;
    return;
  }

  const key = await getAlphaVantageKey();
  initializeApiKey(key);
  lastApiKeyInit = currentTime;
};

const handleCorsPreflight = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-User-Id',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }
  return null;
};

const handleSearch = async (event) => {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized request');
  }

  const { symbol } = getBody(event);
  if (!symbol) {
    return errorResponse(400, 'Missing "symbol" in request body');
  }

  await ensureApiKeyLoaded();

  let rateLimitInfo;
  try {
    rateLimitInfo = await enforceRateLimit(userId);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonResponse(429, {
        error: {
          message: error.message,
          code: error.info?.code ?? 'RATE_LIMIT',
          ...error.info,
        },
      });
    }
    throw error;
  }

  const startedAt = Date.now();
  let duration;
  try {
    const data = await fetchAllFinancialData(symbol);
    duration = Date.now() - startedAt;
    console.log('[Search] success', {
      userId,
      symbol: symbol.toUpperCase(),
      remaining: rateLimitInfo.remaining,
      resetAt: rateLimitInfo.resetAt,
      durationMs: duration,
    });
    return successResponse({
      data,
      rateLimit: rateLimitInfo,
    }, CACHE_CONTROL_HEADER);
  } catch (error) {
    duration = Date.now() - startedAt;
    console.warn('[Search] failure', {
      userId,
      symbol: symbol.toUpperCase(),
      durationMs: duration,
      error: error.message,
    });
    return errorResponse(500, error.message);
  }
};

const handleQuota = async (event) => {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized request');
  }

  const quota = await getQuota(userId);
  return successResponse(quota);
};

const handleCacheClear = async (event) => {
  const userId = getUserId(event);
  if (!userId) {
    return errorResponse(401, 'Unauthorized request');
  }

  const { symbol } = event.queryStringParameters ?? {};
  clearCachedData(symbol);
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

    if (httpMethod === 'POST' && normalizedPath === '/stocks/search') {
      return await handleSearch(event);
    }

    if (httpMethod === 'GET' && normalizedPath === '/quota') {
      return await handleQuota(event);
    }

    if (httpMethod === 'DELETE' && normalizedPath === '/cache') {
      return await handleCacheClear(event);
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

