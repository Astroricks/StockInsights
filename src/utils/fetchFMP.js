import axios from 'axios';

// Financial Modeling Prep API configuration
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Note: In production, this should be moved to environment variables
// For now, users will need to replace 'YOUR_API_KEY' with their actual FMP API key
const API_KEY = 'WTGc78tUCPZu91pfgwjhEDbE10ABfodC';

// Create axios instance with default config
const fmpApi = axios.create({
  baseURL: FMP_BASE_URL,
  timeout: 15000, // 15 second timeout
});

// Helper function to add API key to requests
const addApiKey = (params = {}) => ({
  ...params,
  apikey: API_KEY
});

// Helper function to format date for API requests
const formatDate = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Helper function to get date range for historical data
const getDateRange = (months = 12) => {
  const now = new Date();
  const pastDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return {
    from: formatDate(pastDate),
    to: formatDate(now)
  };
};

// Fetch company profile
export const fetchCompanyProfile = async (symbol) => {
  try {
    const response = await fmpApi.get(`/profile/${symbol.toUpperCase()}`, {
      params: addApiKey()
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`No company profile found for symbol: ${symbol}`);
    }

    return data[0]; // FMP returns an array, take first item
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
    const response = await fmpApi.get(`/quote/${symbol.toUpperCase()}`, {
      params: addApiKey()
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`No quote data found for symbol: ${symbol}`);
    }

    return data[0]; // FMP returns an array, take first item
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

// Fetch historical price data
export const fetchHistoricalData = async (symbol, months = 12) => {
  try {
    const { from, to } = getDateRange(months);
    
    const response = await fmpApi.get(`/historical-price-full/${symbol.toUpperCase()}`, {
      params: addApiKey({ from, to })
    });

    const data = response.data;
    
    if (!data || !data.historical || data.historical.length === 0) {
      throw new Error(`No historical data found for symbol: ${symbol}`);
    }

    // Format data for charts (reverse to get chronological order)
    return data.historical.reverse().map(item => ({
      date: item.date,
      close: item.close,
      open: item.open,
      high: item.high,
      low: item.low,
      volume: item.volume,
      change: item.change,
      changePercent: item.changePercent
    }));
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
};

// Fetch income statement data
export const fetchIncomeStatement = async (symbol, period = 'quarter', limit = 20) => {
  try {
    const response = await fmpApi.get(`/income-statement/${symbol.toUpperCase()}`, {
      params: addApiKey({ period, limit })
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`No income statement data found for symbol: ${symbol}`);
    }

    // Reverse to get chronological order (oldest first)
    return data.reverse();
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    throw new Error(`Failed to fetch income statement: ${error.message}`);
  }
};

// Fetch balance sheet data
export const fetchBalanceSheet = async (symbol, period = 'quarter', limit = 20) => {
  try {
    const response = await fmpApi.get(`/balance-sheet-statement/${symbol.toUpperCase()}`, {
      params: addApiKey({ period, limit })
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`No balance sheet data found for symbol: ${symbol}`);
    }

    // Reverse to get chronological order (oldest first)
    return data.reverse();
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    throw new Error(`Failed to fetch balance sheet: ${error.message}`);
  }
};

// Fetch cash flow statement data
export const fetchCashFlowStatement = async (symbol, period = 'quarter', limit = 20) => {
  try {
    const response = await fmpApi.get(`/cash-flow-statement/${symbol.toUpperCase()}`, {
      params: addApiKey({ period, limit })
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`No cash flow data found for symbol: ${symbol}`);
    }

    // Reverse to get chronological order (oldest first)
    return data.reverse();
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    throw new Error(`Failed to fetch cash flow statement: ${error.message}`);
  }
};

// Fetch financial ratios
export const fetchFinancialRatios = async (symbol, period = 'quarter', limit = 20) => {
  try {
    const response = await fmpApi.get(`/ratios/${symbol.toUpperCase()}`, {
      params: addApiKey({ period, limit })
    });

    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`No financial ratios found for symbol: ${symbol}`);
    }

    // Reverse to get chronological order (oldest first)
    return data.reverse();
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    throw new Error(`Failed to fetch financial ratios: ${error.message}`);
  }
};

// Fetch all financial data for comprehensive dashboard
export const fetchAllFinancialData = async (symbol, period = 'quarter') => {
  try {
    const [
      profile,
      quote,
      historicalData,
      incomeStatement,
      balanceSheet,
      cashFlowStatement,
      financialRatios
    ] = await Promise.allSettled([
      fetchCompanyProfile(symbol),
      fetchStockQuote(symbol),
      fetchHistoricalData(symbol, 12), // 12 months of price data
      fetchIncomeStatement(symbol, period),
      fetchBalanceSheet(symbol, period),
      fetchCashFlowStatement(symbol, period),
      fetchFinancialRatios(symbol, period)
    ]);

    const result = {
      symbol: symbol.toUpperCase(),
      profile: profile.status === 'fulfilled' ? profile.value : null,
      quote: quote.status === 'fulfilled' ? quote.value : null,
      historicalData: historicalData.status === 'fulfilled' ? historicalData.value : [],
      incomeStatement: incomeStatement.status === 'fulfilled' ? incomeStatement.value : [],
      balanceSheet: balanceSheet.status === 'fulfilled' ? balanceSheet.value : [],
      cashFlowStatement: cashFlowStatement.status === 'fulfilled' ? cashFlowStatement.value : [],
      financialRatios: financialRatios.status === 'fulfilled' ? financialRatios.value : [],
      errors: []
    };

    // Collect any errors
    const requests = [
      { name: 'Profile', result: profile },
      { name: 'Quote', result: quote },
      { name: 'Historical Data', result: historicalData },
      { name: 'Income Statement', result: incomeStatement },
      { name: 'Balance Sheet', result: balanceSheet },
      { name: 'Cash Flow', result: cashFlowStatement },
      { name: 'Financial Ratios', result: financialRatios }
    ];

    requests.forEach(({ name, result }) => {
      if (result.status === 'rejected') {
        result.errors.push(`${name}: ${result.reason.message}`);
      }
    });

    // If all critical requests failed, throw an error
    if (!result.profile && !result.quote && result.historicalData.length === 0) {
      throw new Error(`Failed to fetch basic data for ${symbol}: ${result.errors.join(', ')}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to fetch financial data: ${error.message}`);
  }
};

// Helper function to format financial data for charts
export const formatChartData = (data, valueKey, labelKey = 'date') => {
  if (!data || data.length === 0) return [];
  
  return data.map(item => ({
    date: item[labelKey] || item.date || item.calendarYear,
    value: item[valueKey] || 0,
    label: item[labelKey] || item.date || item.calendarYear
  })).filter(item => item.value !== null && item.value !== undefined);
};

// Helper function to format quarterly labels
export const formatQuarterLabel = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const quarter = Math.floor(d.getMonth() / 3) + 1;
  
  return `Q${quarter} ${year}`;
};

// Utility function to validate API key
export const validateApiKey = () => {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    throw new Error('Please set your FMP API key in src/utils/fetchFMP.js');
  }
  return true;
};

export default {
  fetchCompanyProfile,
  fetchStockQuote,
  fetchHistoricalData,
  fetchIncomeStatement,
  fetchBalanceSheet,
  fetchCashFlowStatement,
  fetchFinancialRatios,
  fetchAllFinancialData,
  formatChartData,
  formatQuarterLabel,
  validateApiKey
};

