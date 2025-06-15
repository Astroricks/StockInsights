import axios from 'axios';

// Alpha Vantage API configuration
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Default to demo key, will be overridden by user's key if set
let API_KEY = 'demo';

// Create axios instance with default config
const alphaVantageApi = axios.create({
  baseURL: ALPHA_VANTAGE_BASE_URL,
  timeout: 30000, // 30 second timeout for fundamental data
});

// Initialize API key from localStorage
export const initializeApiKey = () => {
  const storedKey = localStorage.getItem('alpha_vantage_api_key');
  if (storedKey) {
    API_KEY = storedKey;
  }
};

// Update API key
export const updateApiKey = (newKey) => {
  API_KEY = newKey || 'demo';
};

// Add API key to request params
const addApiKey = (params = {}) => ({
  ...params,
  apikey: API_KEY
});

// Validate API key
export const validateApiKey = (ticker) => {
  // Allow IBM with demo key
  if (ticker === 'IBM' && API_KEY === 'demo') {
    return true;
  }
  
  // Check if API key is set
  if (!API_KEY || API_KEY === 'demo') {
    throw new Error('Please set your Alpha Vantage API key in Settings to search for stocks other than IBM.');
  }
  
  return true;
};

// ===== CACHING STRATEGY =====
// Alpha Vantage free tier: 25 calls/day
// Strategy: Cache data in localStorage with 24-hour expiration
// This ensures we don't exceed the daily limit

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache management functions
const getCacheKey = (symbol, endpoint) => `av_${symbol}_${endpoint}`;

const getCachedData = (symbol, endpoint) => {
  try {
    const cacheKey = getCacheKey(symbol, endpoint);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within 24 hours)
    if (now - timestamp < CACHE_DURATION) {
      console.log(`📥 Using cached data for ${symbol} ${endpoint}`);
      return data;
    } else {
      // Remove expired cache
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (error) {
    console.warn('Cache read error:', error);
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
    console.log(`💾 Cached data for ${symbol} ${endpoint}`);
  } catch (error) {
    console.warn('Cache write error:', error);
  }
};

// Test function to verify API key works
export const testApiKey = async () => {
  try {
    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'GLOBAL_QUOTE',
        symbol: 'AAPL'
      })
    });
    
    const data = response.data;
    
    // Check for rate limiting in the response
    if (isRateLimited(data)) {
      throw new Error(getRateLimitMessage(data));
    }
    
    return data;
  } catch (error) {
    console.error('API key test failed:', error);
    // Check if the error response contains rate limit information
    if (error.response?.data && isRateLimited(error.response.data)) {
      throw new Error(getRateLimitMessage(error.response.data));
    }
    throw error;
  }
};

// Add a helper function to detect rate limiting
const isRateLimited = (data) => {
  // Check for Alpha Vantage's specific rate limit message
  if (data['Information'] && data['Information'].includes('rate limit')) {
    return true;
  }
  
  // Check for the legacy Note field
  if (data['Note'] && data['Note'].includes('frequency limit')) {
    return true;
  }
  
  return false;
};

// Add a helper function to get rate limit message
const getRateLimitMessage = (data) => {
  if (data['Information'] && data['Information'].includes('rate limit')) {
    // Extract useful info from the message
    const info = data['Information'];
    if (info.includes('25 requests per day')) {
      return 'API rate limit exceeded (25 requests/day limit reached). Please try again tomorrow or upgrade to a premium plan.';
    }
    return `API rate limit exceeded: ${info}`;
  }
  
  if (data['Note']) {
    return 'API call frequency limit reached. Please try again later.';
  }
  
  return 'API rate limit exceeded. Please try again tomorrow.';
};

// Helper function to filter out incomplete current year data
const filterIncompleteCurrentYear = (data, isAnnual = false) => {
  if (!isAnnual || !data || data.length === 0) return data;
  
  const currentYear = new Date().getFullYear();

  return data.filter(item => {
    // Handle both date strings and year properties
    const itemYear = item.year ? item.year : new Date(item.date).getFullYear();
    return itemYear < currentYear;
  });
};

// ===== 1️⃣ PRICE HISTORY =====
export const fetchHistoricalData = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    // Check cache first
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

    // Parse and format data for charts
    const historicalData = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        close: parseFloat(values['5. adjusted close']),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        volume: parseInt(values['6. volume']),
        change: 0, // Will calculate below
        changePercent: 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically

    // Calculate daily changes
    for (let i = 1; i < historicalData.length; i++) {
      const current = historicalData[i];
      const previous = historicalData[i - 1];
      current.change = current.close - previous.close;
      current.changePercent = previous.close > 0 ? (current.change / previous.close) * 100 : 0;
    }

    // Only cache if we have actual data
    if (historicalData.length > 0) {
      setCachedData(symbol, 'daily', historicalData);
    }
    
    return historicalData;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again tomorrow.');
    }
    // Check if the error response contains rate limit information
    if (error.response?.data && isRateLimited(error.response.data)) {
      throw new Error(getRateLimitMessage(error.response.data));
    }
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
};

// Helper function to filter historical data based on timeframe
export const filterHistoricalData = (data, period = 'quarterly') => {
  if (!data || data.length === 0) return [];
  
  const cutoffDate = new Date();
  if (period === 'annual') {
    // For annual view, get all available data (up to 20 years)
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 20);
  } else {
    // For quarterly view, get 5 years of data
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
  }
  
  return data.filter(item => new Date(item.date) >= cutoffDate);
};

// ===== 2️⃣ INCOME STATEMENT =====
export const fetchIncomeStatement = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    // Check cache first
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

    // Parse annual data (all available years)
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
      })).reverse(), // Reverse to get chronological order
      true // isAnnual
    );

    // Parse quarterly data (last 20 quarters = 5 years)
    const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
      date: report.fiscalDateEnding,
      period: 'quarter',
      revenue: parseInt(report.totalRevenue) || 0,
      ebitda: parseInt(report.ebitda) || 
              (parseInt(report.operatingIncome) || 0) + (parseInt(report.depreciationAmortization) || 0),
      netIncome: parseInt(report.netIncome) || 0,
      eps: parseFloat(report.reportedEPS) || 0,
      operatingExpenses: parseInt(report.totalOperatingExpense) || 0
    })).reverse(); // Reverse to get chronological order

    const result = {
      annual: annualData,
      quarterly: quarterlyData
    };

    // Only cache if we have actual data
    if (annualData.length > 0 || quarterlyData.length > 0) {
      setCachedData(symbol, 'income', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again tomorrow.');
    }
    throw new Error(`Failed to fetch income statement: ${error.message}`);
  }
};

// ===== 3️⃣ CASH FLOW STATEMENT =====
export const fetchCashFlowStatement = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    // Check cache first
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

    // Parse annual data (all available years)
    const annualData = filterIncompleteCurrentYear(
      annualReports.map(report => ({
        date: report.fiscalDateEnding,
        period: 'annual',
        freeCashFlow: parseInt(report.operatingCashflow) - Math.abs(parseInt(report.capitalExpenditures) || 0),
        operatingCashFlow: parseInt(report.operatingCashflow) || 0,
        capitalExpenditures: parseInt(report.capitalExpenditures) || 0,
        dividendsPaid: Math.abs(parseInt(report.dividendPayout) || 0)
      })).reverse(),
      true // isAnnual
    );

    // Parse quarterly data
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

    // Only cache if we have actual data
    if (annualData.length > 0 || quarterlyData.length > 0) {
      setCachedData(symbol, 'cashflow', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again tomorrow.');
    }
    throw new Error(`Failed to fetch cash flow statement: ${error.message}`);
  }
};

// ===== 4️⃣ BALANCE SHEET =====
export const fetchBalanceSheet = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    // Check cache first
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

    // Parse annual data (all available years)
    const annualData = filterIncompleteCurrentYear(
      annualReports.map(report => ({
        date: report.fiscalDateEnding,
        period: 'annual',
        cash: parseInt(report.cashAndCashEquivalentsAtCarryingValue) || 
              parseInt(report.cashAndShortTermInvestments) || 0,
        totalDebt: (parseInt(report.shortTermDebt) || 0) + (parseInt(report.longTermDebt) || 0),
        shortTermDebt: parseInt(report.shortTermDebt) || 0,
        longTermDebt: parseInt(report.longTermDebt) || 0,
        commonStockSharesOutstanding: parseInt(report.commonStockSharesOutstanding) || 0,
        totalAssets: parseInt(report.totalAssets) || 0,
        totalLiabilities: parseInt(report.totalLiabilities) || 0
      })).reverse(),
      true // isAnnual
    );

    // Parse quarterly data
    const quarterlyData = quarterlyReports.slice(0, 20).map(report => ({
      date: report.fiscalDateEnding,
      period: 'quarter',
      cash: parseInt(report.cashAndCashEquivalentsAtCarryingValue) || 
            parseInt(report.cashAndShortTermInvestments) || 0,
      totalDebt: (parseInt(report.shortTermDebt) || 0) + (parseInt(report.longTermDebt) || 0),
      shortTermDebt: parseInt(report.shortTermDebt) || 0,
      longTermDebt: parseInt(report.longTermDebt) || 0,
      commonStockSharesOutstanding: parseInt(report.commonStockSharesOutstanding) || 0,
      totalAssets: parseInt(report.totalAssets) || 0,
      totalLiabilities: parseInt(report.totalLiabilities) || 0
    })).reverse();

    const result = {
      annual: annualData,
      quarterly: quarterlyData
    };

    // Only cache if we have actual data
    if (annualData.length > 0 || quarterlyData.length > 0) {
      setCachedData(symbol, 'balance', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again tomorrow.');
    }
    throw new Error(`Failed to fetch balance sheet: ${error.message}`);
  }
};

// ===== COMPANY OVERVIEW =====
export const fetchCompanyProfile = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    // Check cache first
    const cached = getCachedData(symbol, 'overview');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'OVERVIEW',
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

    if (!data.Symbol) {
      throw new Error(`No company profile found for symbol: ${symbol}`);
    }

    const profile = {
      symbol: data.Symbol,
      companyName: data.Name,
      description: data.Description,
      sector: data.Sector,
      industry: data.Industry,
      exchange: data.Exchange,
      currency: data.Currency,
      country: data.Country,
      marketCap: parseInt(data.MarketCapitalization) || 0,
      peRatio: parseFloat(data.PERatio) || 0,
      pegRatio: parseFloat(data.PEGRatio) || 0,
      bookValue: parseFloat(data.BookValue) || 0,
      dividendPerShare: parseFloat(data.DividendPerShare) || 0,
      dividendYield: parseFloat(data.DividendYield) || 0,
      eps: parseFloat(data.EPS) || 0,
      revenuePerShareTTM: parseFloat(data.RevenuePerShareTTM) || 0,
      profitMargin: parseFloat(data.ProfitMargin) || 0,
      operatingMarginTTM: parseFloat(data.OperatingMarginTTM) || 0,
      returnOnAssetsTTM: parseFloat(data.ReturnOnAssetsTTM) || 0,
      returnOnEquityTTM: parseFloat(data.ReturnOnEquityTTM) || 0,
      revenueTTM: parseInt(data.RevenueTTM) || 0,
      grossProfitTTM: parseInt(data.GrossProfitTTM) || 0,
      dilutedEPSTTM: parseFloat(data.DilutedEPSTTM) || 0,
      quarterlyEarningsGrowthYOY: parseFloat(data.QuarterlyEarningsGrowthYOY) || 0,
      quarterlyRevenueGrowthYOY: parseFloat(data.QuarterlyRevenueGrowthYOY) || 0,
      analystTargetPrice: parseFloat(data.AnalystTargetPrice) || 0,
      trailingPE: parseFloat(data.TrailingPE) || 0,
      forwardPE: parseFloat(data.ForwardPE) || 0,
      priceToSalesRatioTTM: parseFloat(data.PriceToSalesRatioTTM) || 0,
      priceToBookRatio: parseFloat(data.PriceToBookRatio) || 0,
      evToRevenue: parseFloat(data.EVToRevenue) || 0,
      evToEBITDA: parseFloat(data.EVToEBITDA) || 0,
      beta: parseFloat(data.Beta) || 0,
      week52High: parseFloat(data['52WeekHigh']) || 0,
      week52Low: parseFloat(data['52WeekLow']) || 0,
      day50MovingAverage: parseFloat(data['50DayMovingAverage']) || 0,
      day200MovingAverage: parseFloat(data['200DayMovingAverage']) || 0,
      sharesOutstanding: parseInt(data.SharesOutstanding) || 0,
      dividendDate: data.DividendDate,
      exDividendDate: data.ExDividendDate
    };

    // Only cache if we have valid profile data (has symbol and name)
    if (profile.symbol && profile.companyName) {
      setCachedData(symbol, 'overview', profile);
    }
    
    return profile;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again tomorrow.');
    }
    throw new Error(`Failed to fetch company profile: ${error.message}`);
  }
};

// ===== EARNINGS DATA =====
export const fetchEarningsData = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    // Check cache first
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

    const annualEarnings = data.annualEarnings || [];
    const quarterlyEarnings = data.quarterlyEarnings || [];

    // Parse annual data (all available years)
    const annualData = filterIncompleteCurrentYear(
      annualEarnings.map(report => ({
        date: report.fiscalDateEnding,
        period: 'annual',
        eps: parseFloat(report.reportedEPS) || 0,
        estimatedEPS: parseFloat(report.estimatedEPS) || null,
        surprise: parseFloat(report.surprise) || null,
        surprisePercentage: parseFloat(report.surprisePercentage) || null
      })).reverse(), // Reverse to get chronological order
      true // isAnnual
    );

    // Parse quarterly data (last 20 quarters = 5 years)
    const quarterlyData = quarterlyEarnings.slice(0, 20).map(report => ({
      date: report.fiscalDateEnding,
      period: 'quarter',
      eps: parseFloat(report.reportedEPS) || 0,
      estimatedEPS: parseFloat(report.estimatedEPS) || null,
      surprise: parseFloat(report.surprise) || null,
      surprisePercentage: parseFloat(report.surprisePercentage) || null,
      reportedDate: report.reportedDate
    })).reverse();

    const result = {
      annual: annualData,
      quarterly: quarterlyData
    };

    // Only cache if we have actual data
    if (annualData.length > 0 || quarterlyData.length > 0) {
      setCachedData(symbol, 'earnings', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again tomorrow.');
    }
    throw new Error(`Failed to fetch earnings data: ${error.message}`);
  }
};

// ===== DIVIDENDS DATA =====
export const fetchDividendsData = async (symbol) => {
  try {
    validateApiKey(symbol);
    
    // Check cache first
    const cached = getCachedData(symbol, 'dividends');
    if (cached) return cached;

    const response = await alphaVantageApi.get('', {
      params: addApiKey({
        function: 'DIVIDENDS',
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

    if (!data.data || data.data.length === 0) {
      throw new Error(`No dividend data found for symbol: ${symbol}`);
    }

    // Parse dividend data - get all available dividend history
    const dividendData = data.data.map((dividend, index) => {
      const parsedAmount = parseFloat(dividend.amount);
      const result = {
        date: dividend.ex_dividend_date,
        dividendAmount: parsedAmount || 0,
        declarationDate: dividend.declaration_date !== "None" ? dividend.declaration_date : null,
        recordDate: dividend.record_date !== "None" ? dividend.record_date : null,
        paymentDate: dividend.payment_date !== "None" ? dividend.payment_date : null
      };
      
      return result;
    }).reverse(); // Reverse to get chronological order
    
    // Filter quarterly data to last 5 years
    const cutOffDate = new Date();
    cutOffDate.setFullYear(cutOffDate.getFullYear() - 5);
    const quarterlyData = dividendData.filter(div => new Date(div.date) >= cutOffDate);
    
    // Group by year for annual totals
    const annualDividends = {};
    dividendData.forEach(div => {
      if (div.date) {
        const year = new Date(div.date).getFullYear();
        if (year && !isNaN(year)) {
          if (!annualDividends[year]) {
            annualDividends[year] = {
              year,
              totalDividend: 0,
              dividendCount: 0,
              dates: []
            };
          }
          annualDividends[year].totalDividend += div.dividendAmount;
          annualDividends[year].dividendCount += 1;
          annualDividends[year].dates.push(div.date);
        }
      }
    });

    const result = {
      quarterly: quarterlyData,
      annual: filterIncompleteCurrentYear(
        Object.values(annualDividends).sort((a, b) => a.year - b.year), // All years in chronological order
        true // isAnnual
      )
    };

    // Only cache if we have actual dividend data
    if (dividendData.length > 0) {
      setCachedData(symbol, 'dividends', result);
    }
    
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again tomorrow.');
    }
    throw new Error(`Failed to fetch dividends data: ${error.message}`);
  }
};

// ===== COMBINED DATA FETCH =====
export const fetchAllFinancialData = async (symbol, period = 'quarterly') => {
  try {
    validateApiKey(symbol);
    
    // Fetch all data with proper error handling
    const [
      profile,
      historicalData,
      incomeStatement,
      cashFlowStatement,
      balanceSheet,
      earningsData,
      dividendsData
    ] = await Promise.allSettled([
      fetchCompanyProfile(symbol),
      fetchHistoricalData(symbol),
      fetchIncomeStatement(symbol),
      fetchCashFlowStatement(symbol),
      fetchBalanceSheet(symbol),
      fetchEarningsData(symbol),
      fetchDividendsData(symbol)
    ]);

    const result = {
      symbol: symbol.toUpperCase(),
      profile: profile.status === 'fulfilled' ? profile.value : null,
      originalHistoricalData: historicalData.status === 'fulfilled' ? historicalData.value : [],
      historicalData: historicalData.status === 'fulfilled' ? filterHistoricalData(historicalData.value, period) : [],
      incomeStatement: incomeStatement.status === 'fulfilled' ? incomeStatement.value : { annual: [], quarterly: [] },
      cashFlowStatement: cashFlowStatement.status === 'fulfilled' ? cashFlowStatement.value : { annual: [], quarterly: [] },
      balanceSheet: balanceSheet.status === 'fulfilled' ? balanceSheet.value : { annual: [], quarterly: [] },
      earningsData: earningsData.status === 'fulfilled' ? earningsData.value : { annual: [], quarterly: [] },
      dividendsData: dividendsData.status === 'fulfilled' ? dividendsData.value : null,
      errors: []
    };

    // Collect any errors
    const requests = [
      { name: 'Profile', result: profile },
      { name: 'Historical Data', result: historicalData },
      { name: 'Income Statement', result: incomeStatement },
      { name: 'Cash Flow', result: cashFlowStatement },
      { name: 'Balance Sheet', result: balanceSheet },
      { name: 'Earnings', result: earningsData },
      { name: 'Dividends', result: dividendsData }
    ];

    requests.forEach(({ name, result: reqResult }) => {
      if (reqResult.status === 'rejected') {
        result.errors.push(`${name}: ${reqResult.reason.message}`);
      }
    });

    // If all critical requests failed, throw an error
    if (!result.profile && result.historicalData.length === 0) {
      throw new Error(`Failed to fetch basic data for ${symbol}: ${result.errors.join(', ')}`);
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to fetch financial data: ${error.message}`);
  }
};

// ===== UTILITY FUNCTIONS =====

// Helper function to format financial data for charts
export const formatChartData = (data, valueKey, labelKey = 'date') => {
  if (!data || data.length === 0) return [];
  
  return data.map(item => ({
    date: item[labelKey] || item.date,
    value: item[valueKey] || 0,
    label: item[labelKey] || item.date
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

// Helper function to format annual labels (just the year)
export const formatAnnualLabel = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.getFullYear().toString();
};

// Helper function to format labels based on timeframe
export const formatTimeframeLabel = (date, isAnnual = false) => {
  if (isAnnual) {
    return formatAnnualLabel(date);
  } else {
    return formatQuarterLabel(date);
  }
};

// Cache management utilities
export const clearCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('av_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Alpha Vantage cache cleared');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

export const getCacheInfo = () => {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('av_'));
    const cacheInfo = cacheKeys.map(key => {
      const cached = JSON.parse(localStorage.getItem(key));
      const age = Date.now() - cached.timestamp;
      const hoursOld = Math.floor(age / (1000 * 60 * 60));
      return {
        key,
        age: `${hoursOld}h`,
        expires: `${24 - hoursOld}h`
      };
    });
    return cacheInfo;
  } catch (error) {
    console.warn('Failed to get cache info:', error);
    return [];
  }
};

export default {
  fetchCompanyProfile,
  fetchHistoricalData,
  fetchIncomeStatement,
  fetchCashFlowStatement,
  fetchBalanceSheet,
  fetchEarningsData,
  fetchDividendsData,
  fetchAllFinancialData,
  formatChartData,
  formatQuarterLabel,
  formatAnnualLabel,
  formatTimeframeLabel,
  validateApiKey,
  testApiKey,
  clearCache,
  getCacheInfo
};