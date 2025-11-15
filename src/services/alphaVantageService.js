import axios from 'axios';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const API_KEY_STORAGE_PREFIX = 'alpha_vantage_api_key';

let API_KEY = null;
let CURRENT_USER_ID = null;

// Forward declaration for clearCache (defined later in the file)
let clearCacheFunction;

// Helper to get user-specific storage key
const getUserStorageKey = (userId) => {
  if (!userId) {
    return API_KEY_STORAGE_PREFIX; // Fallback to global key for backward compatibility
  }
  return `${API_KEY_STORAGE_PREFIX}_${userId}`;
};

// API Key Management (localStorage-based, user-specific)
export const saveApiKey = (apiKey, userId = null) => {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('Valid API key is required');
  }
  
  const trimmedKey = apiKey.trim();
  const storageKey = getUserStorageKey(userId);
  
  // Check if the key is actually changing
  const oldKey = localStorage.getItem(storageKey);
  const keyChanged = oldKey !== trimmedKey;
  
  localStorage.setItem(storageKey, trimmedKey);
  API_KEY = trimmedKey;
  CURRENT_USER_ID = userId;
  
  // Clear cache when API key changes
  if (keyChanged && clearCacheFunction) {
    clearCacheFunction();
  }
  
  return { success: true, message: 'API key saved successfully' };
};

export const loadApiKey = (userId = null) => {
  const storageKey = getUserStorageKey(userId);
  const storedKey = localStorage.getItem(storageKey);
  if (storedKey) {
    API_KEY = storedKey;
    CURRENT_USER_ID = userId;
    return storedKey;
  }
  return null;
};

export const deleteApiKey = (userId = null) => {
  const storageKey = getUserStorageKey(userId);
  localStorage.removeItem(storageKey);
  API_KEY = null;
  CURRENT_USER_ID = null;
  
  // Clear cache when API key is deleted
  if (clearCacheFunction) {
    clearCacheFunction();
  }
  
  return { success: true, message: 'API key removed successfully' };
};

export const hasApiKey = (userId = null) => {
  return !!loadApiKey(userId);
};

// Set API key directly (for backward compatibility)
export const setApiKey = (apiKey) => {
  API_KEY = apiKey;
};

export const getApiKey = () => API_KEY;

// Cache utilities
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

// API call wrapper
const callAlphaVantage = async (params) => {
  // Try to load API key from localStorage if not already set
  if (!API_KEY) {
    const storageKey = getUserStorageKey(CURRENT_USER_ID);
    const storedKey = localStorage.getItem(storageKey);
    if (storedKey) {
      API_KEY = storedKey;
    }
  }

  if (!API_KEY) {
    throw new Error('API key not configured. Please set your Alpha Vantage API key.');
  }

  const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
    params: {
      ...params,
      apikey: API_KEY
    },
    timeout: 30000
  });

  const data = response.data;

  if (data['Error Message']) {
    throw new Error(`Invalid symbol or request: ${data['Error Message']}`);
  }

  if (data['Note'] || data['Information']) {
    const errorMessage = data['Note'] || data['Information'];
    throw new Error(`Alpha Vantage API Error: ${errorMessage}`);
  }

  return data;
};

// Filter out incomplete current year data
const filterIncompleteCurrentYear = (data, isAnnual) => {
  if (!isAnnual || !data || data.length === 0) return data;
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  if (currentMonth < 3) {
    return data.filter(item => {
      const itemYear = new Date(item.date).getFullYear();
      return itemYear < currentYear;
    });
  }
  
  return data;
};

// Fetch historical price data
export const fetchHistoricalData = async (symbol) => {
  const cached = getCachedData(symbol, 'historical');
  if (cached) return cached;

  const data = await callAlphaVantage({
    function: 'TIME_SERIES_DAILY_ADJUSTED',
    symbol: symbol.toUpperCase(),
    outputsize: 'full'
  });

  const timeSeries = data['Time Series (Daily)'] || {};
  const historicalData = Object.entries(timeSeries)
    .map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      adjustedClose: parseFloat(values['5. adjusted close']), // Split-adjusted close price
      volume: parseInt(values['6. volume']),
      dividendAmount: parseFloat(values['7. dividend amount']) || 0,
      splitCoefficient: parseFloat(values['8. split coefficient']) || 1
    }))
    .reverse();

  setCachedData(symbol, 'historical', historicalData);
  return historicalData;
};

// Fetch income statement
export const fetchIncomeStatement = async (symbol) => {
  const cached = getCachedData(symbol, 'income');
  if (cached) return cached;

  const data = await callAlphaVantage({
    function: 'INCOME_STATEMENT',
    symbol: symbol.toUpperCase()
  });

  const annualReports = data.annualReports || [];
  const quarterlyReports = data.quarterlyReports || [];

  const annualData = filterIncompleteCurrentYear(
    annualReports.map(report => ({
      date: report.fiscalDateEnding,
      period: 'annual',
      revenue: parseInt(report.totalRevenue) || 0,
      costOfRevenue: parseInt(report.costOfRevenue) || 0,
      grossProfit: parseInt(report.grossProfit) || 0,
      operatingIncome: parseInt(report.operatingIncome) || 0,
      netIncome: parseInt(report.netIncome) || 0,
      ebitda: parseInt(report.ebitda) || 0,
      eps: parseFloat(report.eps) || 0
    })).reverse(),
    true
  );

  const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
    date: report.fiscalDateEnding,
    period: 'quarter',
    revenue: parseInt(report.totalRevenue) || 0,
    costOfRevenue: parseInt(report.costOfRevenue) || 0,
    grossProfit: parseInt(report.grossProfit) || 0,
    operatingIncome: parseInt(report.operatingIncome) || 0,
    netIncome: parseInt(report.netIncome) || 0,
    ebitda: parseInt(report.ebitda) || 0,
    eps: parseFloat(report.eps) || 0
  })).reverse();

  const result = {
    annual: annualData,
    quarterly: quarterlyData
  };

  setCachedData(symbol, 'income', result);
  return result;
};

// Fetch cash flow statement
export const fetchCashFlowStatement = async (symbol) => {
  const cached = getCachedData(symbol, 'cashflow');
  if (cached) return cached;

  const data = await callAlphaVantage({
    function: 'CASH_FLOW',
    symbol: symbol.toUpperCase()
  });

  const annualReports = data.annualReports || [];
  const quarterlyReports = data.quarterlyReports || [];

  const annualData = filterIncompleteCurrentYear(
    annualReports.map(report => ({
      date: report.fiscalDateEnding,
      period: 'annual',
      operatingCashFlow: parseInt(report.operatingCashflow) || 0,
      capitalExpenditures: parseInt(report.capitalExpenditures) || 0,
      freeCashFlow: (parseInt(report.operatingCashflow) || 0) - Math.abs(parseInt(report.capitalExpenditures) || 0)
    })).reverse(),
    true
  );

  const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
    date: report.fiscalDateEnding,
    period: 'quarter',
    operatingCashFlow: parseInt(report.operatingCashflow) || 0,
    capitalExpenditures: parseInt(report.capitalExpenditures) || 0,
    freeCashFlow: (parseInt(report.operatingCashflow) || 0) - Math.abs(parseInt(report.capitalExpenditures) || 0)
  })).reverse();

  const result = {
    annual: annualData,
    quarterly: quarterlyData
  };

  setCachedData(symbol, 'cashflow', result);
  return result;
};

// Fetch balance sheet
export const fetchBalanceSheet = async (symbol) => {
  const cached = getCachedData(symbol, 'balance');
  if (cached) return cached;

  const data = await callAlphaVantage({
    function: 'BALANCE_SHEET',
    symbol: symbol.toUpperCase()
  });

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
      commonStockSharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
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
    commonStockSharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
  })).reverse();

  const result = {
    annual: annualData,
    quarterly: quarterlyData
  };

  setCachedData(symbol, 'balance', result);
  return result;
};

// Fetch company overview
export const fetchCompanyOverview = async (symbol) => {
  const cached = getCachedData(symbol, 'overview');
  if (cached) return cached;

  const data = await callAlphaVantage({
    function: 'OVERVIEW',
    symbol: symbol.toUpperCase()
  });

  // Keep Alpha Vantage's original field names (capital case) for compatibility
  const profile = {
    Symbol: data.Symbol,
    Name: data.Name,
    Description: data.Description,
    Sector: data.Sector,
    Industry: data.Industry,
    Exchange: data.Exchange,
    Currency: data.Currency,
    MarketCapitalization: parseFloat(data.MarketCapitalization) || 0,
    PERatio: parseFloat(data.PERatio) || 0,
    PEGRatio: parseFloat(data.PEGRatio) || 0,
    DividendYield: parseFloat(data.DividendYield) || 0,
    EPS: parseFloat(data.EPS) || 0,
    Beta: parseFloat(data.Beta) || 0,
    BookValue: parseFloat(data.BookValue) || 0,
    '52WeekHigh': parseFloat(data['52WeekHigh']) || 0,
    '52WeekLow': parseFloat(data['52WeekLow']) || 0
  };

  setCachedData(symbol, 'overview', profile);
  return profile;
};

// Fetch earnings data
export const fetchEarningsData = async (symbol) => {
  const cached = getCachedData(symbol, 'earnings');
  if (cached) return cached;

  const data = await callAlphaVantage({
    function: 'EARNINGS',
    symbol: symbol.toUpperCase()
  });

  const quarterlyEarnings = data.quarterlyEarnings || [];
  const annualEarnings = data.annualEarnings || [];

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

  setCachedData(symbol, 'earnings', result);
  return result;
};

// Fetch dividend history
export const fetchDividendHistory = async (symbol) => {
  try {
    const cached = getCachedData(symbol, 'dividends');
    if (cached) return cached;

    const data = await callAlphaVantage({
      function: 'DIVIDENDS',
      symbol: symbol.toUpperCase()
    });

    const dividends = data.data || [];
    
    // Process quarterly dividends
    const quarterly = dividends.slice(0, 40).reverse().map(div => ({
      date: div.ex_dividend_date || div.payment_date,
      dividendAmount: parseFloat(div.amount) || 0,
      declarationDate: div.declaration_date
    }));

    // Aggregate quarterly into annual
    const annualMap = new Map();
    dividends.forEach(div => {
      const date = div.ex_dividend_date || div.payment_date;
      if (date) {
        const year = new Date(date).getFullYear();
        if (!annualMap.has(year)) {
          annualMap.set(year, { year, totalDividend: 0, dividendCount: 0 });
        }
        const yearData = annualMap.get(year);
        yearData.totalDividend += parseFloat(div.amount) || 0;
        yearData.dividendCount += 1;
      }
    });

    // Convert to array and sort by year (oldest to newest)
    const annual = Array.from(annualMap.values())
      .sort((a, b) => a.year - b.year)
      .slice(-20); // Keep last 20 years
    
    const result = {
      annual,
      quarterly
    };

    setCachedData(symbol, 'dividends', result);
    return result;
  } catch (error) {
    console.warn('[AlphaVantage] Dividend fetch failed:', error.message);
    return { annual: [], quarterly: [] };
  }
};

// Fetch all financial data
export const fetchAllFinancialData = async (symbol) => {
  try {
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
      fetchDividendHistory(symbol).catch(err => {
        console.warn(`Dividend fetch failed for ${symbol}:`, err.message);
        return { annual: [], quarterly: [] };
      })
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
  } catch (error) {
    // Clear any partial cache for this symbol on error
    console.warn(`[AlphaVantage] Fetch failed for ${symbol}, clearing cache:`, error.message);
    clearCache(symbol);
    throw error;
  }
};

// Clear cache
export const clearCache = (symbol = null) => {
  if (symbol) {
    const endpoints = ['historical', 'income', 'cashflow', 'balance', 'overview', 'earnings', 'dividends'];
    endpoints.forEach(endpoint => {
      localStorage.removeItem(getCacheKey(symbol, endpoint));
    });
  } else {
    // Clear all Alpha Vantage cache
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('av_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Get cached stock symbols
export const getCachedStocks = () => {
  const symbols = new Set();
  const now = Date.now();
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('av_')) {
      try {
        // Extract symbol from cache key format: av_SYMBOL_endpoint
        const parts = key.split('_');
        if (parts.length >= 3) {
          const symbol = parts[1];
          
          // Check if cache is still valid
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (now - timestamp < CACHE_DURATION) {
              symbols.add(symbol);
            }
          }
        }
      } catch (error) {
        // Skip invalid cache entries
      }
    }
  });
  
  return Array.from(symbols).sort();
};

// Check if a stock has valid cached data
export const isStockCached = (symbol) => {
  if (!symbol) return false;
  
  const normalizedSymbol = symbol.toUpperCase();
  const now = Date.now();
  const endpoints = ['historical', 'income', 'cashflow', 'balance', 'overview', 'earnings', 'dividends'];
  
  // Check if at least the overview endpoint is cached (minimum requirement)
  const overviewKey = getCacheKey(normalizedSymbol, 'overview');
  const cached = getCachedData(normalizedSymbol, 'overview');
  
  return cached !== null;
};

// Assign clearCache to the forward-declared variable so it can be used earlier
clearCacheFunction = clearCache;

// Format timeframe label
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

// Filter historical data by period
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

