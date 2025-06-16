# Stock Research App - Alpha Vantage Edition

A modern React application for comprehensive stock research and financial analysis, powered by Alpha Vantage API with smart caching to optimize the free tier usage.

## 🚀 Features

### Financial Visualizations
- **Price Chart** - Historical stock price trends with interactive tooltips (weekly data points)
- **Revenue Chart** - Quarterly revenue analysis with growth indicators
- **EBITDA Chart** - Earnings before interest, taxes, depreciation, and amortization
- **Free Cash Flow Chart** - Cash flow analysis with positive/negative indicators
- **Net Income Chart** - Quarterly net income with profitability metrics
- **EPS Chart** - Earnings per share with estimates, surprises, and growth tracking  
- **Dividends Chart** - Dividend payment history with growth analysis
- **Cash & Debt Chart** - Cash vs debt comparison with stacked bars
- **Shares Outstanding Chart** - Share count analysis with buyback/dilution indicators

### Smart Caching System
- **24-Hour Cache** - Minimize API calls with localStorage caching
- **Rate Limit Protection** - Stay within Alpha Vantage's 25 calls/day limit
- **Automatic Expiration** - Fresh data every 24 hours
- **Cache Management** - Built-in utilities to view and clear cache

### Interactive Features
- **Time Period Controls** - Switch between Quarterly and Annual views
- **Real-time Search** - Search any stock ticker with autocomplete suggestions
- **Company Overview** - Comprehensive company profile with key metrics
- **Market Indices** - Live market data display in header
- **Responsive Design** - Optimized for desktop and mobile devices

## 📊 Alpha Vantage API Integration

The application uses the following Alpha Vantage API endpoints:

1. **OVERVIEW** - Company profile and basic information
2. **TIME_SERIES_WEEKLY** - Historical weekly price data
3. **INCOME_STATEMENT** - Income statement data
4. **CASH_FLOW** - Cash flow statement data
5. **BALANCE_SHEET** - Balance sheet data
6. **EARNINGS** - Earnings per share data
7. **DIVIDENDS** - Dividend history

### API Call Management

- Each stock search makes 7 API calls in parallel
- Results are cached in localStorage for 24 hours
- Cache can be cleared using the "Clear Cache" button
- Free tier limit: 25 API calls per day

### API Key Management

- API key can be set in the Settings modal
- Key is stored in localStorage for persistence
- Demo key is used for IBM if no key is set
- Key can be cleared using the "Clear API Key" button

## 🛠 Technology Stack

- **Frontend**: React 18 with Vite
- **UI Components**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **API**: Alpha Vantage API with caching
- **HTTP Client**: Axios with timeout and error handling
- **Caching**: localStorage with automatic expiration

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** package manager
3. **Alpha Vantage API Key** from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
pnpm install
```

### 2. API Key Setup

1. Sign up for a free account at [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Get your API key from the dashboard
3. Open `src/utils/fetchAlphaVantage.js`
4. Replace `'YOUR_ALPHA_VANTAGE_API_KEY'` with your actual API key:

```javascript
const API_KEY = 'your_actual_api_key_here';
```

### 3. Development

```bash
# Start development server
pnpm run dev

# Open http://localhost:5173 in your browser
```

### 4. Production Build

```bash
# Create production build
pnpm run build

# Preview production build
pnpm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── PriceChart.jsx         # Historical price chart
│   ├── RevenueChart.jsx       # Revenue visualization
│   ├── EBITDAChart.jsx        # EBITDA analysis
│   ├── CashFlowChart.jsx      # Free cash flow chart
│   ├── NetIncomeChart.jsx     # Net income visualization
│   ├── EPSChart.jsx           # Enhanced earnings per share chart
│   ├── DividendsChart.jsx     # Dividend payment history chart
│   ├── CashDebtChart.jsx      # Cash vs debt comparison
│   ├── SharesOutstandingChart.jsx # Shares outstanding analysis
│   ├── CompanyProfile.jsx     # Company information display
│   ├── StockSearch.jsx        # Search functionality
│   └── ErrorMessage.jsx       # Error handling component
├── utils/
│   └── fetchAlphaVantage.js   # Alpha Vantage API integration
├── App.jsx                    # Main application component
└── main.jsx                   # Application entry point
```

## 🔧 API Integration Details

### Data Processing
- **Automatic Unit Conversion**: Values converted to millions/billions for readability
- **Date Formatting**: Quarterly labels (Q1 2024, Q2 2024, etc.)
- **Growth Calculations**: Quarter-over-quarter and year-over-year growth
- **Missing Data Handling**: Graceful fallbacks for incomplete data

### Caching Strategy
```javascript
// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const getCacheKey = (symbol, endpoint) => `av_${symbol}_${endpoint}`;

// Cache management utilities
import { clearCache, getCacheInfo } from './utils/fetchAlphaVantage';
```

### Error Handling
- **API Key Validation**: Clear setup instructions
- **Rate Limit Management**: User-friendly messages
- **Network Errors**: Retry functionality
- **Invalid Symbols**: Helpful error messages
- **Partial Data**: Graceful degradation

## 🎨 Design Features

### Visual Design
- **Modern UI**: Clean, professional interface with shadcn/ui components
- **Color Coding**: Intuitive color schemes (green for positive, red for negative)
- **Responsive Layout**: Grid-based layout that adapts to screen sizes
- **Interactive Elements**: Hover states, tooltips, and smooth transitions

### User Experience
- **Quick Access**: Suggested popular stock tickers for easy testing
- **Time Period Controls**: Easy switching between quarterly and annual views
- **Loading States**: Clear feedback during data fetching
- **Error Recovery**: Retry functionality with helpful error messages

## 🔍 Usage Examples

### Search for a Stock
1. Enter a ticker symbol (e.g., "AAPL", "GOOGL", "TSLA")
2. Click "Search" or press Enter
3. View comprehensive financial dashboard

### Switch Time Periods
- **Quarterly**: Standard quarterly data
- **Annual**: Annual financial statements

### Analyze Financial Health
- **Revenue Trends**: Track revenue growth over time
- **Profitability**: Monitor EBITDA and net income
- **Cash Position**: Analyze cash vs debt ratios
- **Share Activity**: Identify buybacks or dilution

## 📊 Alpha Vantage Free Tier Management

### Rate Limit Details
- **Daily Limit**: 25 API calls per day (resets at midnight UTC)
- **Per Stock Analysis**: Uses 8 API endpoints = 8 calls
- **Daily Capacity**: 3 stocks per day (3 × 8 = 24 calls)
- **Rate Limit Errors**: Clear messages with upgrade guidance

### Rate Limit Response Example
```json
{
  "Information": "We have detected your API key as BXRWZ50IEE327KHI and our standard API rate limit is 25 requests per day. Please subscribe to any of the premium plans at https://www.alphavantage.co/premium/ to instantly remove all daily rate limits."
}
```

### Usage Strategy
- **Research 3 stocks per day** maximum to stay within limits
- **Cache persists for 24 hours** - revisit stocks without new API calls
- **Plan your research** - prioritize most important stocks
- **Monitor usage** through browser console or Alpha Vantage dashboard

### Cache Management
```javascript
// View cache information
import { getCacheInfo } from './utils/fetchAlphaVantage';
console.log(getCacheInfo());

// Clear all cached data
import { clearCache } from './utils/fetchAlphaVantage';
clearCache();
```

### When Rate Limited
1. **Error Message**: Clear indication of rate limit reached
2. **Cached Data**: Continue using cached data for previously analyzed stocks
3. **Wait Period**: Rate limit resets daily at midnight UTC
4. **Upgrade Option**: Premium plans remove all rate limits

## 🚨 Error Handling

The application includes comprehensive error handling:

- **API Key Validation**: Checks for valid API key before requests
- **Rate Limiting**: Handles API rate limits gracefully with 24-hour cache
- **Network Errors**: Retry functionality for failed requests
- **Data Validation**: Fallbacks for missing or invalid data
- **User Feedback**: Clear error messages with actionable guidance

## 🔧 Customization

### Adding New Charts
1. Create a new chart component in `src/components/`
2. Import and use in `App.jsx`
3. Add data processing logic in `fetchAlphaVantage.js`

### Styling Modifications
- Modify Tailwind classes in components
- Update color schemes in chart configurations
- Customize UI components in `src/components/ui/`

### Cache Configuration
```javascript
// Modify cache duration (in milliseconds)
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours instead of 24

// Custom cache key format
const getCacheKey = (symbol, endpoint) => `custom_${symbol}_${endpoint}`;
```

## 📈 Performance

- **Optimized Builds**: Vite for fast development and production builds
- **Code Splitting**: Dynamic imports for better loading performance
- **Efficient Rendering**: React optimizations and memoization
- **Smart Caching**: localStorage caching reduces API calls and improves speed

## 🔄 Migration from FMP

If you're migrating from the previous FMP version:

1. **API Integration**: Completely rewritten for Alpha Vantage
2. **Caching System**: New 24-hour caching strategy
3. **Data Structure**: Updated to match Alpha Vantage format
4. **Error Handling**: Enhanced for rate limit management
5. **Documentation**: Comprehensive migration guide included

See `ALPHA_VANTAGE_MIGRATION.md` for detailed migration information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with Alpha Vantage API
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Alpha Vantage** for providing comprehensive financial data API
- **shadcn/ui** for beautiful, accessible UI components
- **Recharts** for powerful and flexible charting library
- **Tailwind CSS** for utility-first styling approach

## 📞 Support

For issues or questions:
1. Check the error messages in the application
2. Verify your Alpha Vantage API key is correctly set
3. Review cache status with `getCacheInfo()`
4. Check Alpha Vantage API usage in your dashboard
5. Review the browser console for detailed error information

## 🔗 Resources

- [Alpha Vantage API Documentation](https://www.alphavantage.co/documentation/)
- [Alpha Vantage Support](https://www.alphavantage.co/support/)
- [API Key Management](https://www.alphavantage.co/support/#api-key)

---

**Note**: This application uses Alpha Vantage's free tier (25 calls/day) with intelligent caching to provide comprehensive financial analysis. The caching system ensures you can research multiple stocks efficiently while staying within API limits.

