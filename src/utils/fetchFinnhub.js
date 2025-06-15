import axios from 'axios';

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Note: In production, this should be moved to environment variables
// For now, users will need to replace 'YOUR_API_KEY' with their actual API key
const API_KEY = 'YOUR_API_KEY';

// Create axios instance with default config
const finnhubApi = axios.create({
  baseURL: FINNHUB_BASE_URL,
  timeout: 10000, // 10 second timeout
});

// Helper function to calculate timestamps for 3 months ago
const getThreeMonthsAgo = () => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  return {
    from: Math.floor(threeMonthsAgo.getTime() / 1000),
    to: Math.floor(now.getTime() / 1000)
  };
};

// Helper function to format chart data
const formatChartData = (candleData) => {
  if (!candleData || !candleData.t || !candleData.c) {
    return [];
  }

  const { t: timestamps, c: closePrices } = candleData;
  
  return timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().split('T')[0], // YYYY-MM-DD format
    close: closePrices[index]
  })).filter(item => item.close !== null && item.close !== undefined);
};

// Fetch company profile
export const fetchCompanyProfile = async (symbol) => {
  try {
    const response = await finnhubApi.get('/stock/profile2', {
      params: {
        symbol: symbol.toUpperCase(),
        token: API_KEY
      }
    });

    const data = response.data;
    
    // Check if we got valid data
    if (!data || !data.name) {
      throw new Error(`No company profile found for symbol: ${symbol}`);
    }

    return {
      ...data,
      ticker: symbol.toUpperCase()
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (error.response?.status === 404) {
      throw new Error(`Company profile not found for symbol: ${symbol}`);
    }
    throw new Error(`Failed to fetch company profile: ${error.message}`);
  }
};

// Fetch real-time stock quote
export const fetchStockQuote = async (symbol) => {
  try {
    const response = await finnhubApi.get('/quote', {
      params: {
        symbol: symbol.toUpperCase(),
        token: API_KEY
      }
    });

    const data = response.data;
    
    // Check if we got valid data
    if (!data || data.c === undefined) {
      throw new Error(`No quote data found for symbol: ${symbol}`);
    }

    return data;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (error.response?.status === 404) {
      throw new Error(`Stock quote not found for symbol: ${symbol}`);
    }
    throw new Error(`Failed to fetch stock quote: ${error.message}`);
  }
};

// Fetch historical price data (3 months)
export const fetchHistoricalData = async (symbol) => {
  try {
    const { from, to } = getThreeMonthsAgo();
    
    const response = await finnhubApi.get('/stock/candle', {
      params: {
        symbol: symbol.toUpperCase(),
        resolution: 'D', // Daily resolution
        from: from,
        to: to,
        token: API_KEY
      }
    });

    const data = response.data;
    
    // Check if we got valid data
    if (!data || data.s === 'no_data') {
      throw new Error(`No historical data found for symbol: ${symbol}`);
    }

    if (data.s === 'error') {
      throw new Error(`Error fetching historical data for symbol: ${symbol}`);
    }

    // Format the data for the chart
    const chartData = formatChartData(data);
    
    if (chartData.length === 0) {
      throw new Error(`No valid historical data points found for symbol: ${symbol}`);
    }

    return chartData;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (error.response?.status === 404) {
      throw new Error(`Historical data not found for symbol: ${symbol}`);
    }
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
};

// Fetch all stock data at once
export const fetchAllStockData = async (symbol) => {
  try {
    const [profile, quote, historicalData] = await Promise.allSettled([
      fetchCompanyProfile(symbol),
      fetchStockQuote(symbol),
      fetchHistoricalData(symbol)
    ]);

    const result = {
      symbol: symbol.toUpperCase(),
      profile: profile.status === 'fulfilled' ? profile.value : null,
      quote: quote.status === 'fulfilled' ? quote.value : null,
      historicalData: historicalData.status === 'fulfilled' ? historicalData.value : [],
      errors: []
    };

    // Collect any errors
    if (profile.status === 'rejected') {
      result.errors.push(`Profile: ${profile.reason.message}`);
    }
    if (quote.status === 'rejected') {
      result.errors.push(`Quote: ${quote.reason.message}`);
    }
    if (historicalData.status === 'rejected') {
      result.errors.push(`Historical Data: ${historicalData.reason.message}`);
    }

    // If all requests failed, throw an error
    if (result.errors.length === 3) {
      throw new Error(`Failed to fetch any data for ${symbol}: ${result.errors.join(', ')}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to fetch stock data: ${error.message}`);
  }
};

// Utility function to validate API key
export const validateApiKey = () => {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    throw new Error('Please set your Finnhub API key in src/utils/fetchFinnhub.js');
  }
  return true;
};

export default {
  fetchCompanyProfile,
  fetchStockQuote,
  fetchHistoricalData,
  fetchAllStockData,
  validateApiKey
};

