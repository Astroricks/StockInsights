// Rate limiting utility for user-specific stock searches
// Each user can search:
// - 1 stock per minute (rate limiting)
// - 10 unique stocks every 24 hours (quota limiting)

const RATE_LIMIT_KEY_PREFIX = 'user_rate_limit_';
const MAX_SEARCHES_PER_24H = 10;
const MIN_TIME_BETWEEN_SEARCHES_MS = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get rate limit key for a specific user
 * @param {string} userId - Auth0 user ID (sub claim)
 * @returns {string} localStorage key for this user's rate limit data
 */
const getRateLimitKey = (userId) => {
  return `${RATE_LIMIT_KEY_PREFIX}${userId}`;
};

/**
 * Get rate limit data for a user
 * @param {string} userId - Auth0 user ID
 * @returns {{searches: Array<{ticker: string, timestamp: number}>, resetAt: number, lastSearchTime: number}}
 */
export const getUserRateLimitData = (userId) => {
  if (!userId) return null;
  
  const key = getRateLimitKey(userId);
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    return {
      searches: [],
      resetAt: Date.now() + RATE_LIMIT_WINDOW_MS,
      lastSearchTime: 0
    };
  }
  
  try {
    const data = JSON.parse(stored);
    // Ensure lastSearchTime exists for backward compatibility
    if (data.lastSearchTime === undefined) {
      data.lastSearchTime = 0;
    }
    return data;
  } catch (error) {
    console.error('Error parsing rate limit data:', error);
    return {
      searches: [],
      resetAt: Date.now() + RATE_LIMIT_WINDOW_MS,
      lastSearchTime: 0
    };
  }
};

/**
 * Save rate limit data for a user
 * @param {string} userId - Auth0 user ID
 * @param {Object} data - Rate limit data to save
 */
const saveUserRateLimitData = (userId, data) => {
  if (!userId) return;
  
  const key = getRateLimitKey(userId);
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * Clean up old searches outside the 24-hour window
 * @param {Array<{ticker: string, timestamp: number}>} searches - Array of search records
 * @returns {Array<{ticker: string, timestamp: number}>} Filtered searches
 */
const cleanOldSearches = (searches) => {
  const now = Date.now();
  return searches.filter(search => {
    const age = now - search.timestamp;
    return age < RATE_LIMIT_WINDOW_MS;
  });
};

/**
 * Check if user can perform a search for a specific ticker
 * @param {string} userId - Auth0 user ID
 * @param {string} ticker - Stock ticker symbol
 * @returns {{allowed: boolean, remaining: number, resetAt: number, error?: string, nextSearchAllowedAt?: number}}
 */
export const checkRateLimit = (userId, ticker) => {
  if (!userId) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: null,
      error: 'User ID is required for rate limiting'
    };
  }

  const data = getUserRateLimitData(userId);
  if (!data) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: null,
      error: 'Unable to load rate limit data'
    };
  }

  const now = Date.now();

  // Check per-minute rate limit (1 search per minute)
  if (data.lastSearchTime && (now - data.lastSearchTime) < MIN_TIME_BETWEEN_SEARCHES_MS) {
    const secondsRemaining = Math.ceil((MIN_TIME_BETWEEN_SEARCHES_MS - (now - data.lastSearchTime)) / 1000);
    const nextSearchAllowedAt = data.lastSearchTime + MIN_TIME_BETWEEN_SEARCHES_MS;
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.resetAt,
      nextSearchAllowedAt,
      error: `Rate limit: Please wait ${secondsRemaining} second(s) before searching again. You can search 1 stock per minute.`
    };
  }

  // Clean up old searches
  const cleanedSearches = cleanOldSearches(data.searches);
  
  // Check if we need to reset (24 hours have passed)
  if (now >= data.resetAt) {
    // Reset window
    data.searches = [];
    data.resetAt = now + RATE_LIMIT_WINDOW_MS;
  } else {
    data.searches = cleanedSearches;
  }

  // Count unique tickers searched in the current window
  const uniqueTickers = new Set(cleanedSearches.map(s => s.ticker.toUpperCase()));
  
  // Check if this ticker was already searched (doesn't count against limit, but still subject to per-minute limit)
  const tickerUpper = ticker.toUpperCase();
  const alreadySearched = uniqueTickers.has(tickerUpper);

  // If not already searched, check if we're at the 24-hour quota limit
  if (!alreadySearched && uniqueTickers.size >= MAX_SEARCHES_PER_24H) {
    const hoursUntilReset = Math.ceil((data.resetAt - now) / (60 * 60 * 1000));
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.resetAt,
      error: `Quota limit exceeded. You can search up to ${MAX_SEARCHES_PER_24H} unique stocks per 24 hours. Your limit will reset in approximately ${hoursUntilReset} hour(s).`
    };
  }

  // Save updated data
  saveUserRateLimitData(userId, data);

  const remaining = Math.max(0, MAX_SEARCHES_PER_24H - uniqueTickers.size);
  
  return {
    allowed: true,
    remaining: alreadySearched ? remaining : remaining - 1,
    resetAt: data.resetAt,
    alreadySearched
  };
};

/**
 * Record a search for a user
 * @param {string} userId - Auth0 user ID
 * @param {string} ticker - Stock ticker symbol
 */
export const recordSearch = (userId, ticker) => {
  if (!userId || !ticker) return;

  const data = getUserRateLimitData(userId);
  if (!data) return;

  const tickerUpper = ticker.toUpperCase();
  const now = Date.now();

  // Clean up old searches
  const cleanedSearches = cleanOldSearches(data.searches);
  
  // Check if this ticker was already searched in the current window
  const existingSearch = cleanedSearches.find(s => s.ticker.toUpperCase() === tickerUpper);
  
  if (!existingSearch) {
    // Add new search record
    cleanedSearches.push({
      ticker: tickerUpper,
      timestamp: now
    });
  } else {
    // Update timestamp for existing search
    existingSearch.timestamp = now;
  }

  // Update reset time if window has expired
  if (now >= data.resetAt) {
    data.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  // Update last search time for per-minute rate limiting
  data.lastSearchTime = now;
  data.searches = cleanedSearches;
  saveUserRateLimitData(userId, data);
};

/**
 * Get remaining searches for a user
 * @param {string} userId - Auth0 user ID
 * @returns {{remaining: number, total: number, resetAt: number}}
 */
export const getRemainingSearches = (userId) => {
  if (!userId) {
    return {
      remaining: 0,
      total: MAX_SEARCHES_PER_24H,
      resetAt: null
    };
  }

  const data = getUserRateLimitData(userId);
  if (!data) {
    return {
      remaining: MAX_SEARCHES_PER_24H,
      total: MAX_SEARCHES_PER_24H,
      resetAt: Date.now() + RATE_LIMIT_WINDOW_MS
    };
  }

  const cleanedSearches = cleanOldSearches(data.searches);
  const uniqueTickers = new Set(cleanedSearches.map(s => s.ticker.toUpperCase()));
  const remaining = Math.max(0, MAX_SEARCHES_PER_24H - uniqueTickers.size);

  return {
    remaining,
    total: MAX_SEARCHES_PER_24H,
    resetAt: data.resetAt
  };
};

/**
 * Clear rate limit data for a user (for testing/admin purposes)
 * @param {string} userId - Auth0 user ID
 */
export const clearRateLimitData = (userId) => {
  if (!userId) return;
  const key = getRateLimitKey(userId);
  localStorage.removeItem(key);
};

