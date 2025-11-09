import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import SignInButton from './components/SignInButton';
import { Input } from '@/components/ui/input';
import { Search, Loader2, TrendingUp, Building2, DollarSign, Users, Globe } from 'lucide-react';

// Import chart components
import PriceChart from './components/PriceChart';
import RevenueChart from './components/RevenueChart';
import EBITDAChart from './components/EBITDAChart';
import CashFlowChart from './components/CashFlowChart';
import NetIncomeChart from './components/NetIncomeChart';
import EPSChart from './components/EPSChart';
import CashDebtChart from './components/CashDebtChart';
import SharesOutstandingChart from './components/SharesOutstandingChart';
import DividendsChart from './components/DividendsChart';
import CompanyOverview from './components/CompanyOverview';
import ErrorMessage from './components/ErrorMessage';
import StockButton from './components/StockButton';

// Import Alpha Vantage API functions
import { fetchAllFinancialData, clearCache, filterHistoricalData, initializeApiKey, setApiKeyForUser } from './utils/fetchAlphaVantage';
import { checkRateLimit, recordSearch, getRemainingSearches } from './utils/rateLimit';
import authConfig from './auth_config.json';
import './App.css';

// Format market cap to B/M/K format
const formatMarketCap = (value) => {
  if (!value) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

function App() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, user } = useAuth0();
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTicker, setCurrentTicker] = useState('');
  const [searchTicker, setSearchTicker] = useState('');
  const [timeframe, setTimeframe] = useState('quarter');
  const [loginRequired, setLoginRequired] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [nextSearchAllowedAt, setNextSearchAllowedAt] = useState(null);

  // Update rate limit information display
  const updateRateLimitInfo = () => {
    if (isAuthenticated && user?.sub) {
      const info = getRemainingSearches(user.sub);
      setRateLimitInfo(info);
    }
  };

  // Initialize API key on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Use shared API key for authenticated users
      const sharedKey = authConfig.sharedApiKey;
      if (sharedKey && sharedKey !== 'YOUR_SHARED_ALPHA_VANTAGE_API_KEY') {
        setApiKeyForUser(true, sharedKey);
      } else {
        initializeApiKey();
      }
      // Update rate limit info for authenticated users
      updateRateLimitInfo();
    } else {
      // Use demo key for unauthenticated users
      initializeApiKey();
    }
  }, [isAuthenticated, user]);

  // Update rate limit info periodically
  useEffect(() => {
    if (isAuthenticated && user) {
      updateRateLimitInfo();
      // Update every minute to show accurate remaining time
      const interval = setInterval(updateRateLimitInfo, 60000);
      return () => clearInterval(interval);
    } else {
      setRateLimitInfo(null);
    }
  }, [isAuthenticated, user]);

  // Clear login-required error when user successfully authenticates
  useEffect(() => {
    if (isAuthenticated && loginRequired) {
      setLoginRequired(false);
      setError(null);
      updateRateLimitInfo();
    }
  }, [isAuthenticated, loginRequired]);

  const handleSearch = async (ticker) => {
    // Reset error states
    setError(null);
    setLoginRequired(false);

    // Check if login is required for non-IBM stocks
    const normalizedTicker = ticker.trim().toUpperCase();
    if (normalizedTicker !== 'IBM' && !isAuthenticated) {
      setLoginRequired(true);
      setError('Please sign in to search for stocks other than IBM.');
      return;
    }

    // Check rate limit for authenticated users (IBM is exempt)
    if (isAuthenticated && user?.sub && normalizedTicker !== 'IBM') {
      const rateLimitCheck = checkRateLimit(user.sub, normalizedTicker);
      if (!rateLimitCheck.allowed) {
        setError(rateLimitCheck.error || 'Rate limit exceeded. Please try again later.');
        setNextSearchAllowedAt(rateLimitCheck.nextSearchAllowedAt || null);
        updateRateLimitInfo();
        
        // If it's a per-minute limit, set up a countdown to automatically clear the error
        if (rateLimitCheck.nextSearchAllowedAt) {
          const timeUntilNext = rateLimitCheck.nextSearchAllowedAt - Date.now();
          if (timeUntilNext > 0) {
            setTimeout(() => {
              setNextSearchAllowedAt(null);
              // Optionally clear error after the wait period
            }, timeUntilNext);
          }
        }
        return;
      } else {
        setNextSearchAllowedAt(null);
      }
    }

    try {
      setCurrentTicker(normalizedTicker);
      setSearchTicker(normalizedTicker);
      setLoading(true);
      
      // Fetch all data
      const result = await fetchAllFinancialData(normalizedTicker);
      setFinancialData(result);
      
      // Record the search for rate limiting (only for authenticated users and non-IBM)
      if (isAuthenticated && user?.sub && normalizedTicker !== 'IBM') {
        recordSearch(user.sub, normalizedTicker);
        updateRateLimitInfo();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'An error occurred while fetching data');
      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTicker.trim()) {
      handleSearch(searchTicker.trim().toUpperCase());
    }
  };

  const handleRetry = () => {
    if (currentTicker) {
      handleSearch(currentTicker);
    }
  };

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    // Filter existing historical data based on new timeframe
    if (financialData && financialData.originalHistoricalData) {
      const filteredData = filterHistoricalData(financialData.originalHistoricalData, newTimeframe);
      setFinancialData(prevData => ({
        ...prevData,
        historicalData: filteredData
      }));
    }
  };

  const handleClearCache = () => {
    clearCache();
    alert('Cache cleared! You can now fetch fresh data.');
    setFinancialData(null);
    setCurrentTicker('');
    setSearchTicker('');
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  PrismFin Insights - {currentTicker || 'Stock Research'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Comprehensive financial insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sign In / Sign Out */}
              <SignInButton />
            </div>
          </div>
        </div>
      </header>

      {/* Rate Limiting Information Banner */}
      {isAuthenticated && rateLimitInfo ? (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-800 dark:text-blue-200">
                  <strong>Your Limit:</strong> {rateLimitInfo.remaining} of {rateLimitInfo.total} searches remaining
                  {rateLimitInfo.resetAt && (
                    <span> (resets in {Math.max(0, Math.ceil((rateLimitInfo.resetAt - Date.now()) / (60 * 60 * 1000)))} hours)</span>
                  )}
                </span>
              </div>
              <div className="text-blue-700 dark:text-blue-300">
                <span>1 search per minute • 10 unique stocks per 24 hours • IBM demo is unlimited</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-800 dark:text-yellow-200">
                  <strong>Demo Mode:</strong> IBM stock available • Sign in to search other stocks (1 per minute, 10 per 24 hours)
                </span>
              </div>
              <div className="text-yellow-700 dark:text-yellow-300">
                <span>Cache stores data for 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          {/* Search */}
          <div className="flex gap-2 w-full md:w-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder={isAuthenticated ? "Enter stock ticker (e.g., IBM)" : "Enter stock ticker (IBM demo, others require login)"}
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                className="w-full md:w-64"
                disabled={loading || authLoading}
              />
              <Button 
                type="submit" 
                disabled={loading || authLoading || !searchTicker.trim()}
                className="px-6"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Search'}
              </Button>
            </form>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearCache}
              disabled={loading}
              title="Clear cached data to fetch fresh information"
            >
              Clear Cache
            </Button>
          </div>

          {/* Timeframe Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={timeframe === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeframeChange('quarter')}
            >
              Quarterly
            </Button>
            <Button
              variant={timeframe === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeframeChange('annual')}
            >
              Annual
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage 
              error={error} 
              onRetry={handleRetry}
              loginRequired={loginRequired}
              onLogin={loginRequired ? () => loginWithRedirect() : undefined}
            />
          </div>
        )}
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Fetching comprehensive financial data for {currentTicker}...</span>
            </div>
          </div>
        )}

        {/* Financial Data Display */}
        {financialData && (
          <div className="space-y-6">
            {/* Company Overview */}
            <CompanyOverview profile={financialData.profile} />

            {/* Financial Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Price Chart */}
              <div className="xl:col-span-1">
                <PriceChart 
                  data={financialData.historicalData} 
                  ticker={financialData.symbol}
                  timeframe={timeframe === 'annual' ? '20Y' : '5Y'}
                />
              </div>

              {/* Revenue Chart */}
              <div className="xl:col-span-1">
                <RevenueChart 
                  data={financialData.incomeStatement} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>

              {/* EBITDA Chart */}
              <div className="xl:col-span-1">
                <EBITDAChart 
                  data={financialData.incomeStatement} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>

              {/* Free Cash Flow Chart */}
              <div className="xl:col-span-1">
                <CashFlowChart 
                  data={financialData.cashFlowStatement} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>

              {/* Net Income Chart */}
              <div className="xl:col-span-1">
                <NetIncomeChart 
                  data={financialData.incomeStatement} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>

              {/* EPS Chart */}
              <div className="xl:col-span-1">
                <EPSChart 
                  data={financialData.earningsData} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>

              {/* Cash & Debt Chart */}
              <div className="xl:col-span-1">
                <CashDebtChart 
                  data={financialData.balanceSheet} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>

              {/* Shares Outstanding Chart */}
              <div className="xl:col-span-1">
                <SharesOutstandingChart 
                  data={financialData.balanceSheet} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>

              {/* Dividends Chart */}
              <div className="xl:col-span-1">
                <DividendsChart 
                  data={financialData.dividendsData} 
                  timeframe={timeframe === 'quarter' ? 'Quarterly' : timeframe === 'annual' ? 'Annually' : 'Quarterly (TTM)'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Welcome State */}
        {!financialData && !loading && !error && (
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to PrismFin Insights
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Enter a stock ticker symbol above to get comprehensive financial insights including 
              revenue, EBITDA, cash flow, and more.
              {!isAuthenticated && (
                <span className="block mt-2 text-sm text-orange-600 dark:text-orange-400">
                  IBM is available as a demo. Sign in to search for other stocks.
                </span>
              )}
            </p>
            <div className="text-sm text-muted-foreground mb-8">
              <p className="mb-2">Try the demo stock:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['IBM'].map((ticker) => (
                  <StockButton
                    key={ticker}
                    ticker={ticker}
                    onSearch={handleSearch}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                Try popular stocks like:{' '}
                {!isAuthenticated && (
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    (Sign in required)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'].map((ticker) => (
                  <StockButton
                    key={ticker}
                    ticker={ticker}
                    onSearch={handleSearch}
                    disabled={loading || authLoading}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Powered by <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Alpha Vantage API</a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;

