import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from '@/components/ui/button';
import SignInButton from './components/SignInButton';
import { Input } from '@/components/ui/input';
import { Search, Loader2, TrendingUp, Settings, Info } from 'lucide-react';

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
import SettingsModal from './components/SettingsModal';

// Import services
import { 
  fetchAllFinancialData, 
  clearCache, 
  filterHistoricalData,
  loadApiKey,
  hasApiKey as checkHasApiKey,
  setApiKey as setAlphaVantageApiKey,
  getCachedStocks,
  isStockCached
} from './services/alphaVantageService';
import { logSearch } from './services/backendService';
import './App.css';

function App() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, user, getIdTokenClaims } = useAuth0();
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTicker, setCurrentTicker] = useState('');
  const [searchTicker, setSearchTicker] = useState('');
  const [timeframe, setTimeframe] = useState('quarter');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [cachedStocks, setCachedStocks] = useState([]);

  // Check for API key on mount and auth change
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setApiKeyConfigured(false);
      // Clear API key when user logs out
      setAlphaVantageApiKey(null);
      return;
    }

    // Load API key from localStorage (user-specific)
    const userId = user.sub;
    const key = loadApiKey(userId);
    if (key) {
      setAlphaVantageApiKey(key);
      setApiKeyConfigured(true);
    } else {
      setApiKeyConfigured(false);
      // Automatically show settings modal if user is logged in but has no API key
      if (!authLoading) {
        setShowSettings(true);
      }
    }
  }, [isAuthenticated, authLoading, user]);

  // Load cached stocks on mount and when data changes
  useEffect(() => {
    const updateCachedStocks = () => {
      const stocks = getCachedStocks();
      setCachedStocks(stocks);
    };
    
    updateCachedStocks();
  }, [financialData]); // Update when financial data changes

  const handleApiKeyUpdate = (newKey) => {
    if (newKey) {
      setAlphaVantageApiKey(newKey);
      setApiKeyConfigured(true);
    } else {
      setAlphaVantageApiKey(null);
      setApiKeyConfigured(false);
    }
    
    // Clear displayed data when API key changes
    setFinancialData(null);
    setCurrentTicker('');
    setError(null);
  };

  const handleSearch = async (ticker) => {
    setError(null);

    const normalizedTicker = ticker.trim().toUpperCase();
    const isDemo = normalizedTicker === 'IBM';

    // Allow IBM demo for everyone, require auth for other stocks
    if (!isDemo && !isAuthenticated) {
      setError('Please sign in to search for stocks other than IBM (demo).');
      return;
    }

    // For non-IBM stocks, check if API key is configured
    if (!isDemo && !apiKeyConfigured) {
      setError('Please configure your Alpha Vantage API key in Settings.');
      setShowSettings(true);
      return;
    }

    try {
      setCurrentTicker(normalizedTicker);
      setSearchTicker(normalizedTicker);
      setLoading(true);

      // Check if data is already cached
      const isCached = isStockCached(normalizedTicker);

      // Ensure API key is set before fetching
      if (isDemo && !apiKeyConfigured) {
        // For IBM demo, directly set and use 'demo' key
        setAlphaVantageApiKey('demo');
      } else if (apiKeyConfigured && user) {
        // Reload user's key from localStorage to ensure it's available
        const userKey = loadApiKey(user.sub);
        if (userKey) {
          setAlphaVantageApiKey(userKey);
        }
      }

      // Fire-and-forget: log search to backend (only for authenticated users and non-cached data)
      if (isAuthenticated && getIdTokenClaims && !isCached) {
        logSearch(normalizedTicker, getIdTokenClaims);
      }

      // Fetch data from Alpha Vantage (will use cache if available)
      const data = await fetchAllFinancialData(normalizedTicker);
      
      // Filter historical data based on current timeframe
      if (data.historicalData && data.originalHistoricalData) {
        const filteredData = filterHistoricalData(data.originalHistoricalData, timeframe);
        data.historicalData = filteredData;
      }
      
      setFinancialData(data);
    } catch (fetchError) {
      console.error('Error fetching data:', fetchError);
      const message = fetchError.message || 'An error occurred while fetching data';
      setError(message);
      setFinancialData(null);
      // Refresh cached stocks list (in case partial cache was cleared)
      setCachedStocks(getCachedStocks());
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

  const handleGoHome = () => {
    setFinancialData(null);
    setCurrentTicker('');
    setSearchTicker('');
    setError(null);
  };

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
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
    setFinancialData(null);
    setCurrentTicker('');
    setSearchTicker('');
    setCachedStocks([]); // Clear cached stocks list
    alert('Local cache cleared. Fresh data will be fetched on next search.');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleGoHome}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGoHome();
                }
              }}
            >
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
              {/* Settings */}
              {isAuthenticated && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  title="API Key Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {/* Sign In / Sign Out */}
              <SignInButton />
            </div>
          </div>
        </div>
      </header>

      {/* API Key Configuration Banner */}
      {isAuthenticated && !apiKeyConfigured && (
        <div className="bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-orange-800 dark:text-orange-200">
                  <strong>API Key Required:</strong> Please configure your Alpha Vantage API key to search stocks.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure API Key
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {!isAuthenticated && (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-800 dark:text-blue-200">
                  <strong>Try IBM Demo:</strong> Search "IBM" to see the app in action! Sign in and add your free Alpha Vantage API key to search other stocks.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Rate Limit Banner */}
      {isAuthenticated && apiKeyConfigured && (
        <div className="bg-sky-50 dark:bg-sky-950 border-b border-sky-200 dark:border-sky-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-start gap-3 text-sm">
              <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
              <div className="text-sky-900 dark:text-sky-100">
                <strong className="font-semibold">Free API Key Limits:</strong> Alpha Vantage's free tier allows <strong>25 API calls per day</strong>. 
                Each stock search typically uses <strong>5-7 API calls</strong> (depending on available data), so you can search about <strong>3-5 stocks daily</strong>. 
                Data is cached for 24 hours to help you stay within limits.
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
                placeholder={isAuthenticated && apiKeyConfigured 
                  ? "Enter stock ticker (e.g., AAPL, GOOGL, MSFT)" 
                  : "Enter stock ticker (try IBM demo)"}
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
              disabled={loading || !isAuthenticated}
              title={isAuthenticated ? "Clear cached data to fetch fresh information" : "Sign in to manage cached data"}
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
              Annually
            </Button>
          </div>
        </div>

        {/* Cached Stocks */}
        {cachedStocks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recently Viewed (Cached):</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {cachedStocks.map((stock) => (
                <Button
                  key={stock}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch(stock)}
                  disabled={loading}
                  className={`transition-all hover:scale-105 ${
                    currentTicker === stock 
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white' 
                      : ''
                  }`}
                >
                  {stock}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage 
              error={error} 
              onRetry={handleRetry}
              loginRequired={!isAuthenticated}
              onLogin={!isAuthenticated ? () => loginWithRedirect() : undefined}
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
                  currency={financialData.profile?.Currency}
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
            </p>
            
            {/* IBM Demo - Always Available */}
            <div className="text-sm text-muted-foreground mb-8">
              <p className="mb-2 font-semibold text-lg text-foreground">Try the Demo Stock:</p>
              <div className="flex flex-wrap justify-center gap-2">
                <StockButton
                  ticker="IBM"
                  onSearch={handleSearch}
                  disabled={loading || authLoading}
                />
              </div>
            </div>

            {/* Other Stocks */}
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                Popular stocks to try:{' '}
                {(!isAuthenticated || !apiKeyConfigured) && (
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    (Sign in + API key required)
                  </span>
                )}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'].map((ticker) => (
                  <StockButton
                    key={ticker}
                    ticker={ticker}
                    onSearch={handleSearch}
                    disabled={loading || authLoading || !isAuthenticated || !apiKeyConfigured}
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
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Powered by <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Alpha Vantage API</a>
            </p>
            <p>
              Questions or feedback? Email us at{' '}
              <a href="mailto:prismfininsights@gmail.com" className="text-primary hover:underline">
                prismfininsights@gmail.com
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onApiKeyUpdate={handleApiKeyUpdate}
        userId={user?.sub}
      />
    </div>
  );
}

export default App;
