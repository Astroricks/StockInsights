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

- Each stock search makes 7 API calls in parallel **directly from your browser**
- Results are cached in localStorage for 24 hours
- Cache can be cleared using the "Clear Cache" button
- Free tier limit: 25 API calls per day

### API Key Management

- **Each user provides their own Alpha Vantage API key** (required by Alpha Vantage ToS)
- API key is **stored in browser localStorage** (never sent to backend)
- Frontend uses the key for direct Alpha Vantage API calls
- No shared API key - each user uses their own quota

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
4. **Auth0 Account** (for user authentication) - [Sign up for free](https://auth0.com/)

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
pnpm install
```

### 2. Auth0 Configuration

1. Sign up for a free Auth0 account at [auth0.com](https://auth0.com/)
2. Create a new Application (Single Page Web Application)
3. Configure the following in Auth0 Dashboard:
   - **Allowed Callback URLs**: `http://localhost:5173/StockInsights/`
   - **Allowed Logout URLs**: `http://localhost:5173/StockInsights/`
   - **Allowed Web Origins**: `http://localhost:5173`
4. Copy your Auth0 Domain and Client ID
5. Create `src/auth_config.json` from the template:
   ```bash
   cp src/auth_config.json.example src/auth_config.json
   ```
6. Update `src/auth_config.json` with your Auth0 credentials:
   ```json
   {
     "domain": "your-auth0-domain.auth0.com",
     "clientId": "your-auth0-client-id",
     "redirectUri": "http://localhost:5173/StockInsights/",
     "logoutReturnTo": "http://localhost:5173/StockInsights/"
   }
   ```

### 3. Start the Backend (Required)

```bash
cd backend
npm install
sam build
sam local start-api --env-vars env.local.json --port 3000
```

Leave this running in a terminal.

### 4. Alpha Vantage API Key Setup

1. Sign up for a free account at [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Get your FREE API key (supports 25 requests/day)
3. Start the frontend application (next step)
4. Sign in using Auth0
5. Click the Settings icon (⚙️) in the top right
6. Enter your Alpha Vantage API key in the Settings modal
7. The key will be saved in your browser's localStorage

> **Important**: Each user must provide their own Alpha Vantage API key. This is required by Alpha Vantage's Terms of Service. Your API key is stored locally in your browser and never sent to our servers.

## 🏗️ Backend & Deployment

The application uses an **ultra-minimal AWS backend** for:
1. **Search Logging** - Logs searches to CloudWatch for analytics

The backend **does NOT**:
- ❌ Call Alpha Vantage
- ❌ Store API keys
- ❌ Enforce rate limiting
- ❌ Use DynamoDB or any database

All data fetching happens directly from the frontend to Alpha Vantage using each user's personal API key stored in their browser's localStorage. Search logs go to CloudWatch Logs (automatically captured from Lambda console output).

### Required Environment Variables

Frontend (`.env`):

```
VITE_API_BASE_URL=http://localhost:3000  # For local development
# or
VITE_API_BASE_URL=https://your-api-gateway-id.execute-api.region.amazonaws.com/Prod  # For production
```

Backend (Lambda):

- `ALLOWED_ORIGIN` – Allowed CORS origin (e.g., your frontend domain)
- `ALLOW_ANONYMOUS_LOCAL` – Set to 'true' for local development

### API Overview

- `POST /stocks/search` – Log search to CloudWatch (returns 202 immediately)

**No rate limiting** is enforced by the backend - users are subject to Alpha Vantage's own rate limits (5/min, 500/day).

### Viewing Search Logs

In production, view logs in AWS CloudWatch:
- Log Group: `/aws/lambda/StockInsightsFunction`
- Logs are structured JSON for easy querying:
  ```json
  {
    "event": "stock_search",
    "userId": "auth0|123...",
    "symbol": "AAPL",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "abc-123..."
  }
  ```

### Local Development

```bash
cd backend
npm install
sam build
sam local start-api --env-vars env.local.json --port 3000
```

See [`ARCHITECTURE_CHANGES.md`](ARCHITECTURE_CHANGES.md) for detailed information about the architectural changes.

### 5. Start Frontend Development Server

```bash
# In a new terminal (keep backend running)
pnpm run dev

# Open http://localhost:5173 in your browser
```

### 6. Production Build

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
  "Information": "We have detected your API key as XXXXXXXXXXXXXXXX and our standard API rate limit is 25 requests per day. Please subscribe to any of the premium plans at https://www.alphavantage.co/premium/ to instantly remove all daily rate limits."
}
```

### Usage Strategy
- **Use your own API key** - each user has their own quota
- **No backend rate limiting** - managed entirely by Alpha Vantage
- **Cache persists for 24 minutes** - revisit stocks without new API calls
- **Monitor usage** through Alpha Vantage dashboard (if available)

### Cache Management
```javascript
// Clear all cached data
import { clearCache } from './services/alphaVantageService';
clearCache();

// Clear cache for specific stock
clearCache('AAPL');
```

Or use the "Clear Cache" button in the application UI.

### When Rate Limited
1. **Error Message**: Alpha Vantage error displayed to user
2. **Cached Data**: Continue using cached data for previously analyzed stocks (30 min cache)
3. **Daily limit**: Resets at midnight UTC
4. **Upgrade Option**: Alpha Vantage premium plans offer higher limits

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

## 🔒 Security & Sensitive Information

**⚠️ Important**: Never commit sensitive information to the repository.

### Files Excluded from Git

The following files contain sensitive information and are excluded from version control (see `.gitignore`):

- `src/auth_config.json` - Contains Auth0 domain and client ID
- `.env*` - Environment variables (if used)
- `dist/` - Build outputs

### Setup for New Developers

1. Copy the example configuration file:
   ```bash
   cp src/auth_config.json.example src/auth_config.json
   ```

2. Update `src/auth_config.json` with your own Auth0 credentials

3. Never commit `auth_config.json` or any files containing API keys or secrets

### What's Safe to Commit

- ✅ `src/auth_config.json.example` - Template file with placeholders
- ✅ Source code (without hardcoded secrets)
- ✅ Configuration templates

### What's NOT Safe to Commit

- ❌ `src/auth_config.json` - Contains real Auth0 credentials
- ❌ API keys in source code
- ❌ Environment variables with real values
- ❌ Any hardcoded secrets or tokens

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with Alpha Vantage API
5. Ensure no sensitive information is committed
6. Submit a pull request

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

**Note**: This application requires each user to provide their own Alpha Vantage API key, as required by Alpha Vantage's Terms of Service. The free tier provides 25 requests per day, allowing you to research approximately 7 stocks daily. API keys are stored in your browser's localStorage (never sent to our servers), and all data fetching happens directly from your browser to Alpha Vantage.

