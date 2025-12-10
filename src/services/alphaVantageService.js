import axios from 'axios';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const API_KEY_STORAGE_PREFIX = 'alpha_vantage_api_key';
const API_CALL_DELAY = 250; // Delay between API calls in milliseconds (to avoid rate limiting)

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

// Rate limiting: track last API call time
let lastApiCallTime = 0;

// Helper to delay API calls to avoid rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API call wrapper with rate limiting
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

  // Rate limiting: ensure minimum delay between API calls
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  if (timeSinceLastCall < API_CALL_DELAY) {
    const waitTime = API_CALL_DELAY - timeSinceLastCall;
    await delay(waitTime);
  }
  lastApiCallTime = Date.now();

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

  // Use WEEKLY_ADJUSTED (free tier) instead of DAILY_ADJUSTED (premium)
  const data = await callAlphaVantage({
    function: 'TIME_SERIES_WEEKLY_ADJUSTED',
    symbol: symbol.toUpperCase()
  });

  const timeSeries = data['Weekly Adjusted Time Series'] || {};
  const historicalData = Object.entries(timeSeries)
    .map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      adjustedClose: parseFloat(values['5. adjusted close']), // Split-adjusted close price
      volume: parseInt(values['6. volume']),
      dividendAmount: parseFloat(values['7. dividend amount']) || 0
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

  // Get currency from first report
  const reportedCurrency = annualReports[0]?.reportedCurrency || quarterlyReports[0]?.reportedCurrency || 'USD';

  const annualData = filterIncompleteCurrentYear(
    annualReports.map(report => ({
      date: report.fiscalDateEnding,
      period: 'annual',
      reportedCurrency: report.reportedCurrency || reportedCurrency,
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
    reportedCurrency: report.reportedCurrency || reportedCurrency,
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
    quarterly: quarterlyData,
    currency: reportedCurrency
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

  // Get currency from first report
  const reportedCurrency = annualReports[0]?.reportedCurrency || quarterlyReports[0]?.reportedCurrency || 'USD';

  const annualData = filterIncompleteCurrentYear(
    annualReports.map(report => ({
      date: report.fiscalDateEnding,
      period: 'annual',
      reportedCurrency: report.reportedCurrency || reportedCurrency,
      operatingCashFlow: parseInt(report.operatingCashflow) || 0,
      capitalExpenditures: parseInt(report.capitalExpenditures) || 0,
      freeCashFlow: (parseInt(report.operatingCashflow) || 0) - Math.abs(parseInt(report.capitalExpenditures) || 0)
    })).reverse(),
    true
  );

  const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
    date: report.fiscalDateEnding,
    period: 'quarter',
    reportedCurrency: report.reportedCurrency || reportedCurrency,
    operatingCashFlow: parseInt(report.operatingCashflow) || 0,
    capitalExpenditures: parseInt(report.capitalExpenditures) || 0,
    freeCashFlow: (parseInt(report.operatingCashflow) || 0) - Math.abs(parseInt(report.capitalExpenditures) || 0)
  })).reverse();

  const result = {
    annual: annualData,
    quarterly: quarterlyData,
    currency: reportedCurrency
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

  // Get currency from first report (all reports should have same currency)
  const reportedCurrency = annualReports[0]?.reportedCurrency || quarterlyReports[0]?.reportedCurrency || 'USD';

  const annualData = filterIncompleteCurrentYear(
    annualReports.map(report => {
      // Use cashAndShortTermInvestments if available (most comprehensive), otherwise sum
      const cashAndShortTerm = parseInt(report.cashAndShortTermInvestments) || 0;
      const cashAndEquivalents = parseInt(report.cashAndCashEquivalentsAtCarryingValue) || 0;
      const shortTermInvestments = parseInt(report.shortTermInvestments) || 0;
      const cashValue = cashAndShortTerm || (cashAndEquivalents + shortTermInvestments);
      
      // Try to get comprehensive debt value
      // Use shortLongTermDebtTotal if available (most comprehensive), otherwise sum individual components
      const shortLongTermDebtTotal = parseInt(report.shortLongTermDebtTotal) || 0;
      const shortTermDebt = parseInt(report.shortTermDebt) || 0;
      // Handle "None" string values for long-term debt
      const longTermDebtNoncurrent = (report.longTermDebtNoncurrent === "None" || !report.longTermDebtNoncurrent) 
        ? 0 
        : parseInt(report.longTermDebtNoncurrent) || 0;
      const currentLongTermDebt = (report.currentLongTermDebt === "None" || !report.currentLongTermDebt)
        ? 0
        : parseInt(report.currentLongTermDebt) || 0;
      const longTermDebt = (report.longTermDebt === "None" || !report.longTermDebt)
        ? 0
        : parseInt(report.longTermDebt) || 0;
      
      // Calculate total debt: prefer shortLongTermDebtTotal, otherwise sum all debt components
      const totalDebt = shortLongTermDebtTotal || (shortTermDebt + longTermDebtNoncurrent + currentLongTermDebt + longTermDebt);
      
      return {
        date: report.fiscalDateEnding,
        period: 'annual',
        reportedCurrency: report.reportedCurrency || reportedCurrency,
        totalAssets: parseInt(report.totalAssets) || 0,
        totalLiabilities: parseInt(report.totalLiabilities) || 0,
        cashAndCashEquivalents: cashValue, // Includes cash, cash equivalents, and short-term investments
        shortTermDebt: shortTermDebt,
        longTermDebt: longTermDebtNoncurrent + currentLongTermDebt + longTermDebt, // Sum all long-term debt components
        totalDebt: totalDebt, // Use comprehensive total debt
        totalShareholderEquity: parseInt(report.totalShareholderEquity) || 0,
        commonStockSharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
      };
    }).reverse(),
    true
  );

  const quarterlyData = quarterlyReports.slice(0, 20).map(report => {
    // Use cashAndShortTermInvestments if available (most comprehensive), otherwise sum
    const cashAndShortTerm = parseInt(report.cashAndShortTermInvestments) || 0;
    const cashAndEquivalents = parseInt(report.cashAndCashEquivalentsAtCarryingValue) || 0;
    const shortTermInvestments = parseInt(report.shortTermInvestments) || 0;
    const cashValue = cashAndShortTerm || (cashAndEquivalents + shortTermInvestments);
    
    // Try to get comprehensive debt value
    // Use shortLongTermDebtTotal if available (most comprehensive), otherwise sum individual components
    const shortLongTermDebtTotal = parseInt(report.shortLongTermDebtTotal) || 0;
    const shortTermDebt = parseInt(report.shortTermDebt) || 0;
    // Handle "None" string values for long-term debt
    const longTermDebtNoncurrent = (report.longTermDebtNoncurrent === "None" || !report.longTermDebtNoncurrent) 
      ? 0 
      : parseInt(report.longTermDebtNoncurrent) || 0;
    const currentLongTermDebt = (report.currentLongTermDebt === "None" || !report.currentLongTermDebt)
      ? 0
      : parseInt(report.currentLongTermDebt) || 0;
    const longTermDebt = (report.longTermDebt === "None" || !report.longTermDebt)
      ? 0
      : parseInt(report.longTermDebt) || 0;
    
    // Calculate total debt: prefer shortLongTermDebtTotal, otherwise sum all debt components
    const totalDebt = shortLongTermDebtTotal || (shortTermDebt + longTermDebtNoncurrent + currentLongTermDebt + longTermDebt);
    
    // Debug log for IBM to verify calculations (development only)
    if (import.meta.env.DEV && symbol.toUpperCase() === 'IBM' && report.fiscalDateEnding === '2025-09-30') {
      console.log(`[BalanceSheet] IBM Q3 2025 Final Values:`, {
        cashAndShortTermInvestments: report.cashAndShortTermInvestments,
        cashValue: cashValue,
        cashInBillions: (cashValue / 1000000000).toFixed(2),
        shortLongTermDebtTotal: report.shortLongTermDebtTotal,
        totalDebt: totalDebt,
        debtInBillions: (totalDebt / 1000000000).toFixed(2),
        shortTermDebt: shortTermDebt,
        longTermDebtComponents: {
          longTermDebtNoncurrent: report.longTermDebtNoncurrent,
          currentLongTermDebt: report.currentLongTermDebt,
          longTermDebt: report.longTermDebt
        }
      });
    }
    
    return {
      date: report.fiscalDateEnding,
      period: 'quarter',
      reportedCurrency: report.reportedCurrency || reportedCurrency,
      totalAssets: parseInt(report.totalAssets) || 0,
      totalLiabilities: parseInt(report.totalLiabilities) || 0,
      cashAndCashEquivalents: cashValue, // Includes cash, cash equivalents, and short-term investments
      shortTermDebt: shortTermDebt,
      longTermDebt: longTermDebtNoncurrent + currentLongTermDebt + longTermDebt, // Sum all long-term debt components
      totalDebt: totalDebt, // Use comprehensive total debt
      totalShareholderEquity: parseInt(report.totalShareholderEquity) || 0,
      commonStockSharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
    };
  }).reverse();

  const result = {
    annual: annualData,
    quarterly: quarterlyData,
    currency: reportedCurrency
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

// Extract dividends from historical data (saves 1 API call)
const extractDividendsFromHistorical = (historicalData) => {
  if (!historicalData || historicalData.length === 0) {
    return { annual: [], quarterly: [] };
  }

  // Helper to parse date
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Filter entries with dividends and parse dates
  const dividendEntries = historicalData
    .filter(item => item.dividendAmount && item.dividendAmount > 0)
    .map(item => ({
      date: item.date,
      dividendAmount: item.dividendAmount,
      parsedDate: parseDate(item.date)
    }))
    .filter(item => item.parsedDate !== null)
    .sort((a, b) => b.parsedDate - a.parsedDate); // Newest first

  if (dividendEntries.length === 0) {
    return { annual: [], quarterly: [] };
  }

  // Set up date filters
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  fiveYearsAgo.setHours(0, 0, 0, 0); // Start of day
  const currentYear = today.getFullYear();

  // Filter quarterly to last 5 years
  const quarterly = dividendEntries
    .filter(entry => {
      const year = entry.parsedDate.getFullYear();
      return entry.parsedDate >= fiveYearsAgo && 
             entry.parsedDate <= today && 
             year >= 1900 && 
             year <= currentYear;
    })
    .slice(0, 40) // Limit to 40 most recent within 5 years
    .map(entry => ({
      date: entry.date,
      dividendAmount: entry.dividendAmount,
      declarationDate: null // Not available from weekly data
    }))
    .reverse(); // Reverse to show oldest to newest for chart

  // Aggregate ALL dividends into annual
  const annualMap = new Map();
  dividendEntries
    .filter(entry => {
      const year = entry.parsedDate.getFullYear();
      return entry.parsedDate <= today && 
             year >= 1900 && 
             year <= currentYear;
    })
    .forEach(entry => {
      const year = entry.parsedDate.getFullYear();
      if (!annualMap.has(year)) {
        annualMap.set(year, { year, totalDividend: 0, dividendCount: 0 });
      }
      const yearData = annualMap.get(year);
      yearData.totalDividend += entry.dividendAmount;
      yearData.dividendCount += 1;
    });

  // Convert to array, sort by year (oldest to newest), and keep last 20 years
  const annual = Array.from(annualMap.values())
    .sort((a, b) => a.year - b.year)
    .slice(-20); // Keep last 20 years

  return {
    annual,
    quarterly
  };
};

// Fetch dividend history (now extracted from historical data to save API calls)
export const fetchDividendHistory = async (symbol, historicalData = null) => {
  try {
    const cached = getCachedData(symbol, 'dividends');
    if (cached) return cached;

    // If historical data is provided, extract dividends from it
    // Otherwise, fetch historical data first (it's already cached from fetchAllFinancialData)
    let histData = historicalData;
    if (!histData) {
      histData = await fetchHistoricalData(symbol);
    }

    // Extract dividends from historical data
    const result = extractDividendsFromHistorical(histData);

    setCachedData(symbol, 'dividends', result);
    return result;
  } catch (error) {
    console.warn('[AlphaVantage] Dividend extraction failed:', error.message);
    return { annual: [], quarterly: [] };
  }
};

// Fetch all financial data
export const fetchAllFinancialData = async (symbol) => {
  try {
    // Fetch historical data first (needed for dividend extraction)
    const historicalData = await fetchHistoricalData(symbol);
    
    // Fetch all other data sequentially with delays to avoid rate limiting
    // The delay in callAlphaVantage will space out the calls automatically
    const incomeStatement = await fetchIncomeStatement(symbol);
    const cashFlowStatement = await fetchCashFlowStatement(symbol);
    const balanceSheet = await fetchBalanceSheet(symbol);
    const companyProfile = await fetchCompanyOverview(symbol);
    const earningsData = await fetchEarningsData(symbol);
    
    // Dividends are extracted from historical data, so no API call needed
    const dividendsData = await fetchDividendHistory(symbol, historicalData).catch(err => {
      console.warn(`Dividend extraction failed for ${symbol}:`, err.message);
      return { annual: [], quarterly: [] };
    });

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

