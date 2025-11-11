import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({});
const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE;
const MAX_REQUESTS_PER_WINDOW = Number(process.env.RATE_LIMIT_DAILY_MAX ?? 10);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 86_400_000); // 24h
const RATE_LIMIT_DISABLED = !RATE_LIMIT_TABLE || RATE_LIMIT_TABLE === 'local-rate-limit';

if (RATE_LIMIT_DISABLED) {
  console.log('[RateLimiter] Rate limiting disabled (local development mode)');
}

const now = () => Date.now();

const unmarshallItem = (item) => {
  if (!item) return null;
  return {
    userId: item.userId?.S,
    windowStart: item.windowStart ? Number(item.windowStart.N) : 0,
    requestCount24h: item.requestCount24h ? Number(item.requestCount24h.N) : 0,
    lastRequestTimestamp: item.lastRequestTimestamp ? Number(item.lastRequestTimestamp.N) : 0,
  };
};

export class RateLimitError extends Error {
  constructor(message, info) {
    super(message);
    this.name = 'RateLimitError';
    this.info = info;
  }
}

export const getQuota = async (userId) => {
  if (RATE_LIMIT_DISABLED) {
    return {
      remaining: MAX_REQUESTS_PER_WINDOW,
      total: MAX_REQUESTS_PER_WINDOW,
      resetAt: now() + WINDOW_MS,
    };
  }

  const { Item } = await dynamoClient.send(new GetItemCommand({
    TableName: RATE_LIMIT_TABLE,
    Key: { userId: { S: userId } },
  }));

  if (!Item) {
    return {
      remaining: MAX_REQUESTS_PER_WINDOW,
      total: MAX_REQUESTS_PER_WINDOW,
      resetAt: now() + WINDOW_MS,
    };
  }

  const record = unmarshallItem(Item);
  const currentTime = now();
  const isWindowExpired = currentTime - record.windowStart >= WINDOW_MS;

  return {
    remaining: isWindowExpired
      ? MAX_REQUESTS_PER_WINDOW
      : Math.max(0, MAX_REQUESTS_PER_WINDOW - record.requestCount24h),
    total: MAX_REQUESTS_PER_WINDOW,
    resetAt: isWindowExpired ? currentTime + WINDOW_MS : record.windowStart + WINDOW_MS,
    lastRequestAt: record.lastRequestTimestamp,
  };
};

export const enforceRateLimit = async (userId) => {
  if (!userId) {
    throw new RateLimitError('Unauthorized request', { code: 'UNAUTHORIZED' });
  }

  if (RATE_LIMIT_DISABLED) {
    return {
      remaining: MAX_REQUESTS_PER_WINDOW,
      total: MAX_REQUESTS_PER_WINDOW,
      resetAt: now() + WINDOW_MS,
    };
  }

  const currentTime = now();
  const { Item } = await dynamoClient.send(new GetItemCommand({
    TableName: RATE_LIMIT_TABLE,
    Key: { userId: { S: userId } },
  }));

  const record = unmarshallItem(Item) ?? {
    userId,
    windowStart: currentTime,
    requestCount24h: 0,
  };

  let newWindowStart = record.windowStart;
  let requestCount = record.requestCount24h;

  if (currentTime - record.windowStart >= WINDOW_MS) {
    newWindowStart = currentTime;
    requestCount = 0;
  }

  if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
    const resetAt = newWindowStart + WINDOW_MS;
    const hoursUntilReset = Math.max(0, Math.ceil((resetAt - currentTime) / (60 * 60 * 1000)));
    throw new RateLimitError(`Quota exceeded. You can perform up to ${MAX_REQUESTS_PER_WINDOW} searches every 24 hours.`, {
      code: 'DAILY_QUOTA',
      remaining: 0,
      resetAt,
      hoursUntilReset,
    });
  }

  requestCount += 1;

  await dynamoClient.send(new PutItemCommand({
    TableName: RATE_LIMIT_TABLE,
    Item: {
      userId: { S: userId },
      windowStart: { N: String(newWindowStart) },
      requestCount24h: { N: String(requestCount) },
      lastRequestTimestamp: { N: String(currentTime) },
      updatedAt: { N: String(currentTime) },
    },
  }));

  return {
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - requestCount),
    total: MAX_REQUESTS_PER_WINDOW,
    resetAt: newWindowStart + WINDOW_MS,
  };
};

