import axios from 'axios';

const memoryStorage = new Map();
const localStorage = {
  getItem: (key) => memoryStorage.has(key) ? memoryStorage.get(key) : null,
  setItem: (key, value) => memoryStorage.set(key, value),
  removeItem: (key) => memoryStorage.delete(key),
};

// Alpha Vantage API configuration
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Default to demo key, will be overridden by shared key for authenticated users
let API_KEY = 'demo';
let SHARED_API_KEY = null;

// Create axios instance with default config
const alphaVantageApi = axios.create({
  baseURL: ALPHA_VANTAGE_BASE_URL,
  timeout: 30000, // 30 second timeout for fundamental data
});

// Initialize API key from config (for authenticated users) or localStorage (legacy support)
export const initializeApiKey = (sharedApiKey = null) => {
  SHARED_API_KEY = sharedApiKey;
  const storedKey = localStorage.getItem('alpha_vantage_api_key');
  if (storedKey) {
    API_KEY = storedKey;
  } else if (sharedApiKey) {
    API_KEY = sharedApiKey;
  } else {
    API_KEY = 'demo';
  }
};

// Update API key (legacy function, kept for backward compatibility)
export const updateApiKey = (newKey) => {
  if (!SHARED_API_KEY) {
    API_KEY = newKey || 'demo';
  }
};

// Set the API key to use (for authenticated users with shared key)
export const setApiKeyForUser = (sharedApiKey) => {
  if (sharedApiKey) {
    API_KEY = sharedApiKey;
    SHARED_API_KEY = sharedApiKey;
  }
};

// Add API key to request params
const addApiKey = (params = {}) => ({
  ...params,
  apikey: API_KEY
});

// Validate API key
export const validateApiKey = (ticker) => {
  if (ticker === 'IBM' && API_KEY === 'demo') {
    return true;
  }
  
  if (!API_KEY || API_KEY === 'demo' || API_KEY === 'YOUR_SHARED_ALPHA_VANTAGE_API_KEY') {
    throw new Error('Alpha Vantage API key is not configured for backend use.');
  }
  
  return true;
};

// ===== CACHING STRATEGY =====
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getCacheKey = (symbol, endpoint) => `av_${symbol}_${endpoint}`;

const getCachedData = (symbol, endpoint) => {
  try {
    const cacheKey = getCacheKey(symbol, endpoint);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp < CACHE_DURATION) {
      return data;
    }
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.warn('[AlphaVantage] Cache read error:', error);
    return null;
  }
};

const setCachedData = (symbol, endpoint, data) => {
  try {
    const cacheKey = getCacheKey(symbol, endpoint);
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('[AlphaVantage] Cache write error:', error);
  }
};

export const clearCachedData = (symbol) => {
  if (!symbol) {
    memoryStorage.clear();
    return;
  }

  const upper = symbol.toUpperCase();
  for (const key of [...memoryStorage.keys()]) {
    if (key.startsWith(`av_${upper}_`)) {
      memoryStorage.delete(key);
    }
  }
};

const isRateLimited = (data) => {
  if (data['Information'] && data['Information'].includes('rate limit')) {
    return true;
  }
  
  if (data['Note'] && data['Note'].includes('frequency limit')) {
    return true;
  }
  
  return false;
};

const getRateLimitMessage = (data) => {
  if (data['Information'] && data['Information'].includes('rate limit')) {
    const info = data['Information'];
    if (info.includes('25 requests per day')) {
      return 'Alpha Vantage free tier limit exceeded (25 requests/day).';
    }
    return `Alpha Vantage rate limit exceeded: ${info}`;
  }
  
  if (data['Note']) {
    return 'Alpha Vantage call frequency limit reached. Try again later.';
  }
  
  return 'Alpha Vantage rate limit exceeded. Try again tomorrow.';
};

const filterIncompleteCurrentYear = (data, isAnnual = false) => {
  if (!isAnnual || !data || data.length === 0) return data;
  
  const currentYear = new Date().getFullYear();

  return data.filter(item => {
    const itemYear = item.year ? item.year : new Date(item.date).getFullYear();
    return itemYear < currentYear;
  });
};

export const fetchHistoricalData = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    const cached = getCachedData(symbol, 'daily');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'TIME_SERIES_WEEKLY_ADJUSTED',
        symbol: symbol.toUpperCase()
      })
    });

    const data = response.data;
    
    if (data['Error Message']) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }
    
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }

    const timeSeries = data['Weekly Adjusted Time Series'];
    if (!timeSeries) {
      throw new Error(`No historical data found for symbol: ${symbol}`);
    }

    const historicalData = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        close: parseFloat(values['5. adjusted close']),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        volume: parseInt(values['6. volume']),
        change: 0,
        changePercent: 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = 1; i < historicalData.length; i += 1) {
      const current = historicalData[i];
      const previous = historicalData[i - 1];
      current.change = current.close - previous.close;
      current.changePercent = previous.close > 0 ? (current.change / previous.close) * 100 : 0;
    }

    if (historicalData.length > 0) {
      setCachedData(symbol, 'daily', historicalData);
    }
    
    return historicalData;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Alpha Vantage rate limit exceeded. Try again tomorrow.');
    }
    if (error.response?.data && isRateLimited(error.response.data)) {
      throw new Error(getRateLimitMessage(error.response.data));
    }
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
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

export const fetchIncomeStatement = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    const cached = getCachedData(symbol, 'income');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'INCOME_STATEMENT',
        symbol: symbol.toUpperCase()
      })
    });

    const data = response.data;
    
    if (data['Error Message']) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }
    
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }

    const annualReports = data.annualReports || [];
    const quarterlyReports = data.quarterlyReports || [];

    const annualData = filterIncompleteCurrentYear(
      annualReports.map(report => ({
        date: report.fiscalDateEnding,
        period: 'annual',
        revenue: parseInt(report.totalRevenue) || 0,
        ebitda: parseInt(report.ebitda) || 
                (parseInt(report.operatingIncome) || 0) + (parseInt(report.depreciationAmortization) || 0),
        netIncome: parseInt(report.netIncome) || 0,
        eps: parseFloat(report.reportedEPS) || 0,
        operatingExpenses: parseInt(report.totalOperatingExpense) || 0
      })).reverse(),
      true
    );

    const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
      date: report.fiscalDateEnding,
      period: 'quarter',
      revenue: parseInt(report.totalRevenue) || 0,
      ebitda: parseInt(report.ebitda) || 
              (parseInt(report.operatingIncome) || 0) + (parseInt(report.depreciationAmortization) || 0),
      netIncome: parseInt(report.netIncome) || 0,
      eps: parseFloat(report.reportedEPS) || 0,
      operatingExpenses: parseInt(report.totalOperatingExpense) || 0
    })).reverse();

    const result = {
      annual: annualData,
      quarterly: quarterlyData
    };

    if (annualData.length > 0 || quarterlyData.length > 0) {
      setCachedData(symbol, 'income', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Alpha Vantage rate limit exceeded. Try again tomorrow.');
    }
    throw new Error(`Failed to fetch income statement: ${error.message}`);
  }
};

export const fetchCashFlowStatement = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    const cached = getCachedData(symbol, 'cashflow');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'CASH_FLOW',
        symbol: symbol.toUpperCase()
      })
    });

    const data = response.data;
    
    if (data['Error Message']) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }
    
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }

    const annualReports = data.annualReports || [];
    const quarterlyReports = data.quarterlyReports || [];

    const annualData = filterIncompleteCurrentYear(
      annualReports.map(report => ({
        date: report.fiscalDateEnding,
        period: 'annual',
        freeCashFlow: parseInt(report.operatingCashflow) - Math.abs(parseInt(report.capitalExpenditures) || 0),
        operatingCashFlow: parseInt(report.operatingCashflow) || 0,
        capitalExpenditures: parseInt(report.capitalExpenditures) || 0,
        dividendsPaid: Math.abs(parseInt(report.dividendPayout) || 0)
      })).reverse(),
      true
    );

    const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
      date: report.fiscalDateEnding,
      period: 'quarter',
      freeCashFlow: parseInt(report.operatingCashflow) - Math.abs(parseInt(report.capitalExpenditures) || 0),
      operatingCashFlow: parseInt(report.operatingCashflow) || 0,
      capitalExpenditures: parseInt(report.capitalExpenditures) || 0,
      dividendsPaid: Math.abs(parseInt(report.dividendPayout) || 0)
    })).reverse();

    const result = {
      annual: annualData,
      quarterly: quarterlyData
    };

    if (annualData.length > 0 || quarterlyData.length > 0) {
      setCachedData(symbol, 'cashflow', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Alpha Vantage rate limit exceeded. Try again tomorrow.');
    }
    throw new Error(`Failed to fetch cash flow statement: ${error.message}`);
  }
};

export const fetchBalanceSheet = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    const cached = getCachedData(symbol, 'balance');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'BALANCE_SHEET',
        symbol: symbol.toUpperCase()
      })
    });

    const data = response.data;
    
    if (data['Error Message']) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }
    
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }

    const annualReports = data.annualReports || [];
    const quarterlyReports = data.quarterlyReports || [];

    const annualData = filterIncompleteCurrentYear(
      annualReports.map(report => ({
        date: report.fiscalDateEnding,
        period: 'annual',
        totalAssets: parseInt(report.totalAssets) || 0,
        totalLiabilities: parseInt(report.totalLiabilities) || 0,
        cashAndCashEquivalents: parseInt(report.cashAndCashEquivalentsAtCarryingValue) || 0,
        shortTermDebt: parseInt(report.shortTermDebt) || 0,
        longTermDebt: parseInt(report.longTermDebtNoncurrent) || 0,
        totalShareholderEquity: parseInt(report.totalShareholderEquity) || 0,
        sharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
      })).reverse(),
      true
    );

    const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
      date: report.fiscalDateEnding,
      period: 'quarter',
      totalAssets: parseInt(report.totalAssets) || 0,
      totalLiabilities: parseInt(report.totalLiabilities) || 0,
      cashAndCashEquivalents: parseInt(report.cashAndCashEquivalentsAtCarryingValue) || 0,
      shortTermDebt: parseInt(report.shortTermDebt) || 0,
      longTermDebt: parseInt(report.longTermDebtNoncurrent) || 0,
      totalShareholderEquity: parseInt(report.totalShareholderEquity) || 0,
      sharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
    })).reverse();

    const result = {
      annual: annualData,
      quarterly: quarterlyData
    };

    if (annualData.length > 0 || quarterlyData.length > 0) {
      setCachedData(symbol, 'balance', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Alpha Vantage rate limit exceeded. Try again tomorrow.');
    }
    throw new Error(`Failed to fetch balance sheet: ${error.message}`);
  }
};

export const fetchCompanyOverview = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    const cached = getCachedData(symbol, 'overview');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'OVERVIEW',
        symbol: symbol.toUpperCase()
      })
    });

    const data = response.data;
    
    if (!data || Object.keys(data).length === 0) {
      throw new Error(`No company overview found for symbol: ${symbol}`);
    }
    
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }

    setCachedData(symbol, 'overview', data);
    return data;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Alpha Vantage rate limit exceeded. Try again tomorrow.');
    }
    throw new Error(`Failed to fetch company overview: ${error.message}`);
  }
};

export const fetchEarningsData = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    const cached = getCachedData(symbol, 'earnings');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'EARNINGS',
        symbol: symbol.toUpperCase()
      })
    });

    const data = response.data;
    
    if (data['Error Message']) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }
    
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }

    const quarterlyEarnings = data.quarterlyEarnings || [];
    const annualEarnings = data.annualEarnings || [];

    // Transform data to match frontend expectations
    const transformEarningsItem = (item) => ({
      date: item.fiscalDateEnding,
      reportedDate: item.reportedDate,
      eps: parseFloat(item.reportedEPS) || 0,
      estimatedEPS: parseFloat(item.estimatedEPS),
      surprise: parseFloat(item.surprise),
      surprisePercentage: parseFloat(item.surprisePercentage)
    });

    const result = {
      quarterly: quarterlyEarnings.slice(0, 24).reverse().map(transformEarningsItem),
      annual: annualEarnings.reverse().map(transformEarningsItem)
    };

    if (result.quarterly.length > 0 || result.annual.length > 0) {
      setCachedData(symbol, 'earnings', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Alpha Vantage rate limit exceeded. Try again tomorrow.');
    }
    throw new Error(`Failed to fetch earnings data: ${error.message}`);
  }
};

export const fetchDividendHistory = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    const cached = getCachedData(symbol, 'dividends');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'DIVIDEND_HISTORY',
        symbol: symbol.toUpperCase()
      })
    });

    const data = response.data;
    
    if (data['Error Message']) {
      console.warn(`[fetchAllFinancialData] Dividend fetch failed for ${symbol}:`, data['Error Message']);
      return [];
    }
    
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }

    const dividends = data.data || [];
    const formattedDividends = dividends.map(item => ({
      date: item.paymentDate,
      dividend: parseFloat(item.dividend) || 0,
      declarationDate: item.declarationDate,
      recordDate: item.recordDate,
      paymentDate: item.paymentDate
    })).filter(item => item.dividend > 0).reverse();

    setCachedData(symbol, 'dividends', formattedDividends);
    return formattedDividends;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('Alpha Vantage rate limit exceeded. Try again tomorrow.');
    }
    throw new Error(`Failed to fetch dividend history: ${error.message}`);
  }
};

export const fetchAllFinancialData = async (symbol) => {
  validateApiKey(symbol);

  const [
    historicalData,
    incomeStatement,
    cashFlowStatement,
    balanceSheet,
    companyProfile,
    earningsData,
    dividendsData
  ] = await Promise.all([
    fetchHistoricalData(symbol),
    fetchIncomeStatement(symbol),
    fetchCashFlowStatement(symbol),
    fetchBalanceSheet(symbol),
    fetchCompanyOverview(symbol),
    fetchEarningsData(symbol),
    fetchDividendHistory(symbol)
  ]);

  return {
    symbol: symbol.toUpperCase(),
    historicalData,
    incomeStatement,
    cashFlowStatement,
    balanceSheet,
    profile: companyProfile,
    earningsData,
    dividendsData,
    originalHistoricalData: historicalData,
  };
};

