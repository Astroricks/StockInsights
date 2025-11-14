const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const buildUrl = (path) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${path}`;
};

const defaultHeaders = () => ({
  'Content-Type': 'application/json',
});

/**
 * Log user's search (fire-and-forget)
 * @param {string} symbol - Stock ticker symbol
 * @param {object} userInfo - User information (name, email)
 */
export const logSearch = async (symbol, userInfo = {}) => {
  try {
    // Don't await - fire and forget
    fetch(buildUrl('/stocks/search'), {
      method: 'POST',
      headers: defaultHeaders(),
      credentials: 'include',
      body: JSON.stringify({ 
        symbol,
        userName: userInfo.name,
        userEmail: userInfo.email
      }),
    }).catch(err => {
      console.warn('[Backend] Failed to log search:', err);
    });
  } catch (error) {
    console.warn('[Backend] Failed to initiate search log:', error);
  }
};
