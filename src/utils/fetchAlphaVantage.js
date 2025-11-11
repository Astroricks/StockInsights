import { fetchQuota, fetchStockData, filterHistoricalData as filterHistoricalDataInternal } from '@/api/stockService';

export const formatTimeframeLabel = (dateString, isAnnual = false) => {
  if (!dateString) return 'Unknown';
  const parsed = new Date(dateString);

  if (Number.isNaN(parsed.getTime())) {
    return dateString;
  }

  const year = parsed.getFullYear();

  if (isAnnual) {
    return `FY ${year}`;
  }

  const quarter = Math.floor(parsed.getMonth() / 3) + 1;
  return `Q${quarter} ${year}`;
};

export const initializeApiKey = () => {
  // Legacy no-op kept for backwards compatibility
};

export const updateApiKey = () => {
  // Legacy no-op kept for backwards compatibility
};

export const testApiKey = async () => ({
  status: 'deprecated',
  message: 'API keys are managed server-side.',
});

export const clearCache = () => Promise.resolve();

export const fetchAllFinancialData = async (symbol) => {
  const response = await fetchStockData(symbol);
  return response.data;
};

export const fetchRateLimitInfo = async () => {
  return fetchQuota();
};

export const filterHistoricalData = filterHistoricalDataInternal;

