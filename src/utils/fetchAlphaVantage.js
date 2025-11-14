// Re-export all functions from the new Alpha Vantage service
export {
  setApiKey,
  fetchAllFinancialData,
  filterHistoricalData,
  formatTimeframeLabel,
  clearCache
} from '../services/alphaVantageService';

// Legacy compatibility exports
export const initializeApiKey = () => {
  // No-op for backward compatibility
};

export const updateApiKey = () => {
  // No-op for backward compatibility
};

export const testApiKey = async () => ({
  status: 'deprecated',
  message: 'API key testing moved to direct Alpha Vantage calls.',
});
