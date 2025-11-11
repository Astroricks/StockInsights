const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const buildUrl = (path) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${path}`;
};

const defaultHeaders = () => ({
  'Content-Type': 'application/json',
});

const parseResponse = async (response) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = data?.error ?? {};
    const message = error.message ?? response.statusText;
    const err = new Error(message);
    err.status = response.status;
    err.details = error;
    throw err;
  }
  return data;
};

export const fetchStockData = async (symbol) => {
  const response = await fetch(buildUrl('/stocks/search'), {
    method: 'POST',
    headers: defaultHeaders(),
    credentials: 'include',
    body: JSON.stringify({ symbol }),
  });
  return parseResponse(response);
};

export const fetchQuota = async () => {
  const response = await fetch(buildUrl('/quota'), {
    method: 'GET',
    headers: defaultHeaders(),
    credentials: 'include',
  });
  return parseResponse(response);
};

export const filterHistoricalData = (data, period = 'quarterly') => {
  if (!data || data.length === 0) return [];
  
  const cutoffDate = new Date();
  if (period === 'annual') {
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 20);
  } else {
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
  }
  
  return data.filter(item => new Date(item.date) >= cutoffDate);
};

