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
 * @param {Function} getIdTokenClaims - Auth0 function to get ID token claims
 */
export const logSearch = async (symbol, getIdTokenClaims) => {
  try {
    if (!getIdTokenClaims) {
      console.warn('[Backend] Cannot log search: getIdTokenClaims is required');
      return;
    }
    
    // Get ID token from Auth0 (contains user identity claims)
    let token;
    try {
      const claims = await getIdTokenClaims();
      if (claims && claims.__raw) {
        token = claims.__raw; // Use raw ID token JWT
      } else {
        console.warn('[Backend] ID token claims missing __raw property');
        return;
      }
    } catch (tokenError) {
      console.error('[Backend] Failed to get ID token:', tokenError);
      return;
    }
    
    if (!token) {
      console.warn('[Backend] Cannot log search: failed to get ID token');
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
    })
    .then(response => {
      if (!response.ok) {
        console.warn('[Backend] Search log failed:', response.status, response.statusText);
        return response.text().then(text => {
          console.warn('[Backend] Error response body:', text);
        });
      }
    })
    .catch(err => {
      console.warn('[Backend] Failed to log search:', err);
    });
  } catch (error) {
    console.warn('[Backend] Failed to initiate search log:', error);
  }
};
