# Stock Insights Backend (AWS Lambda)

Serverless backend for the Stock Insights application. Provides secured access to Alpha Vantage data, server-side rate limiting, and usage metrics.

## Architecture

- **API Gateway** – HTTPS entry point, JWT authorizer (Auth0) recommended
- **AWS Lambda** – Primary compute (this project)
- **Secrets Manager** – Stores Alpha Vantage API key (`ALPHA_VANTAGE_SECRET_ID`)
- **DynamoDB** – Enforces per-user rate limits (`RATE_LIMIT_TABLE`)
- **CloudWatch** – Logs, custom metrics (`METRICS_NAMESPACE`)
- **(Optional)** API Gateway response caching for result caching (`Cache-Control` headers provided)

## Endpoints

| Method | Path             | Description                                              |
|--------|------------------|----------------------------------------------------------|
| POST   | `/stocks/search` | Fetches all financial data for a ticker (rate limited)   |
| GET    | `/quota`         | Returns remaining quota and next search availability     |

> `OPTIONS` requests are handled automatically for CORS preflight.

## Environment Variables

| Name                         | Description                                                  |
|------------------------------|--------------------------------------------------------------|
| `ALPHA_VANTAGE_SECRET_ID`    | Secrets Manager secret ID containing the API key (required)  |
| `RATE_LIMIT_TABLE`           | DynamoDB table name for rate-limiting state (required)       |
| `METRICS_NAMESPACE`          | CloudWatch metrics namespace (default: `StockInsights/Usage`)|
| `RATE_LIMIT_DAILY_MAX`       | Max unique tickers per 24h (default: `10`)                   |
| `RATE_LIMIT_WINDOW_MS`       | Rolling window duration (default: `86400000`)                |
| `ALLOWED_ORIGIN`             | CORS origin (default: `*`)                                   |
| `SECRET_CACHE_TTL_MS`        | Secrets Manager cache TTL (default: `300000`)                |

Additional (optional):
- `METRICS_NAMESPACE` – only needed if you decide to emit custom CloudWatch metrics later.

### DynamoDB Table Schema (`RATE_LIMIT_TABLE`)

- **Partition key**: `userId` (string)
- Attributes:
  - `windowStart` (number)
  - `requestCount24h` (number)
  - `lastRequestTimestamp` (number)
  - `updatedAt` (number)

## Deployment (example using SAM)

1. **Install dependencies**
   ```bash
   cd backend
   pnpm install
   ```

2. **Package and deploy** *(requires the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html); install it first if `sam` is not found)*
   ```bash
   sam build
   sam deploy --guided
   ```

3. **Configure Secrets Manager**
   ```bash
   aws secretsmanager create-secret \
     --name StockInsightsAlphaVantage \
     --secret-string '{"API_KEY":"YOUR_ALPHA_VANTAGE_KEY"}'
   ```

4. **Create DynamoDB table**
   ```bash
   aws dynamodb create-table \
     --table-name StockInsightsRateLimit \
     --attribute-definitions AttributeName=userId,AttributeType=S \
     --key-schema AttributeName=userId,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

5. **Set environment variables** (example)
   ```bash
   aws lambda update-function-configuration \
     --function-name stock-insights-backend \
     --environment "Variables={\
ALPHA_VANTAGE_SECRET_ID=StockInsightsAlphaVantage,\
RATE_LIMIT_TABLE=StockInsightsRateLimit,\
METRICS_NAMESPACE=StockInsights/Usage,\
ALLOWED_ORIGIN=https://your-frontend-domain\
}"
   ```

## Local Testing

You can run the handler locally by simulating an event:

```bash
node --loader ts-node/esm scripts/invoke-local.mjs
```

Or use tools like [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html) (`sam local invoke`) / [Serverless Framework](https://www.serverless.com/framework/docs/providers/aws/cli-reference/invoke-local/).

### Local API Development with SAM

To spin up the API locally and point your frontend at it:

```bash
sam local start-api \
  --env-vars env.local.json
```

- Create an `env.local.json` file with the environment variables your Lambda expects, e.g.
  ```json
  {
    "StockInsightsFunction": {
      "ALPHA_VANTAGE_SECRET_ID": "local-dev",
      "RATE_LIMIT_TABLE": "local-rate-limit",
      "RATE_LIMIT_DAILY_MAX": 10,
      "RATE_LIMIT_WINDOW_MS": 86400000,
      "ALLOWED_ORIGIN": "http://localhost:5173",
      "API_KEY_CACHE_TTL_MS": 300000
    }
  }
  ```
- Provide mock implementations (or stubs) for AWS resources if you’re purely local:
  - Swap `getAlphaVantageKey` to return a test key when `ALPHA_VANTAGE_SECRET_ID` is `local-dev`.
  - Replace DynamoDB calls with a local implementation (e.g. [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)) or a simple in-memory store for testing.
- Point the frontend’s `VITE_API_BASE_URL` to `http://127.0.0.1:3000` (the SAM default) while running the local API.
- When finished, stop with `Ctrl+C`.

## Notes

- Alpha Vantage responses are cached in-memory within the Lambda execution context for ~30 minutes.
- Responses include `Cache-Control` headers so API Gateway caching can be enabled.
- CloudWatch logs capture per-search context (user, ticker, duration, success/failure). Metrics are not emitted by default.
- Rate-limit errors return `429` with structured JSON detailing retry timing and remaining quota.

