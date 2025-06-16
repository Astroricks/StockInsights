import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, TrendingUp, Building2, DollarSign, Settings, Users, Globe } from 'lucide-react';

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

// Import Alpha Vantage API functions
import { fetchAllFinancialData, clearCache, filterHistoricalData, initializeApiKey, updateApiKey } from './utils/fetchAlphaVantage';
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
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTicker, setCurrentTicker] = useState('IBM');
  const [searchTicker, setSearchTicker] = useState('');
  const [timeframe, setTimeframe] = useState('quarter');
  const [showSettings, setShowSettings] = useState(false);

  // Initialize API key on mount
  useEffect(() => {
    initializeApiKey();
  }, []);

  const handleSearch = async (ticker) => {
    try {
      setError(null);
      setCurrentTicker(ticker);
      setSearchTicker(ticker);
      setLoading(true);
      
      // Fetch all data
      const result = await fetchAllFinancialData(ticker);
      setFinancialData(result);
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

  const handleApiKeyUpdate = (newKey) => {
    updateApiKey(newKey);
    // If we have a current ticker that's not IBM, refresh the data
    if (currentTicker && currentTicker !== 'IBM') {
      handleSearch(currentTicker);
    }
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
                  Seemple Insights - {currentTicker || 'Stock Research'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Comprehensive financial analysis and insights
                </p>
              </div>
            </div>
            
            {/* Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Rate Limiting Information Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-800">
                <strong>Free Tier:</strong> 25 API calls/day • 7 calls per stock • ~3 stocks per day max
              </span>
            </div>
            <div className="text-yellow-700">
              <span>Cache stores data for 24 hours • Rate limit resets at midnight UTC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          {/* Search */}
          <div className="flex gap-2 w-full md:w-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter stock ticker (e.g., IBM)"
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
                className="w-full md:w-64"
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={loading || !searchTicker.trim()}
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
            <ErrorMessage error={error} onRetry={handleRetry} />
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
              Welcome to Seemple Financial Insights
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Enter a stock ticker symbol above to get comprehensive financial analysis including 
              revenue, EBITDA, cash flow, and more.
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
              <p className="mb-2">Try popular stocks like:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META'].map((ticker) => (
                  <StockButton
                    key={ticker}
                    ticker={ticker}
                    onSearch={handleSearch}
                    disabled={loading}
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

      <SettingsModal 
        open={showSettings} 
        onOpenChange={setShowSettings}
        onApiKeyUpdate={handleApiKeyUpdate}
      />
    </div>
  );
}

export default App;

