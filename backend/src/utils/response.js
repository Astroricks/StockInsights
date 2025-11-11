export const jsonResponse = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': extraHeaders['Cache-Control'] ?? 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    ...extraHeaders,
  },
  body: JSON.stringify(body),
});

export const successResponse = (body, extraHeaders) => jsonResponse(200, body, extraHeaders);

export const errorResponse = (statusCode, message, details) => jsonResponse(statusCode, {
  error: {
    message,
    ...(details ?? {}),
  },
});

