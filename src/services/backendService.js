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
 * @param {Function} getAccessTokenSilently - Auth0 function to get access token
 */
export const logSearch = async (symbol, getAccessTokenSilently) => {
  try {
    if (!getAccessTokenSilently) {
      console.warn('[Backend] Cannot log search: getAccessTokenSilently is required');
      return;
    }
    
    // Get JWT token from Auth0
    const token = await getAccessTokenSilently({
      authorizationParams: {
        audience: undefined, // Use default audience
      }
    });
    
    if (!token) {
      console.warn('[Backend] Cannot log search: failed to get access token');
      return;
    }
    
    // Don't await - fire and forget
    fetch(buildUrl('/stocks/search'), {
      method: 'POST',
      headers: {
        ...defaultHeaders(),
        'Authorization': `Bearer ${token}`,  // Send JWT token in Authorization header
      },
      credentials: 'include',
      body: JSON.stringify({ 
        symbol
      }),
    }).catch(err => {
      console.warn('[Backend] Failed to log search:', err);
    });
  } catch (error) {
    console.warn('[Backend] Failed to initiate search log:', error);
  }
};
