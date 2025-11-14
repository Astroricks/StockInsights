# Stock Insights Backend (AWS Lambda)

Ultra-minimal serverless backend for search logging and analytics. This backend **does not** handle API keys, rate limiting, or proxy Alpha Vantage API calls.

## Architecture

The backend has been deliberately kept minimal:

- **API Gateway** – HTTPS entry point with CORS configuration
- **AWS Lambda** – Single function for logging (this project)
- **CloudWatch Logs** – Stores structured search logs for analytics

**What this backend does NOT include:**
- ❌ API key storage or management
- ❌ Rate limiting
- ❌ Alpha Vantage API proxying
- ❌ Caching layer

## API Endpoint

| Method | Path             | Description                                              |
|--------|------------------|----------------------------------------------------------|
| POST   | `/stocks/search` | Logs user search to CloudWatch (returns 204 immediately) |

> `OPTIONS` requests are handled automatically for CORS preflight.

### POST /stocks/search

**Request Body:**
```json
{
  "symbol": "AAPL",
  "userName": "John Doe",
  "userEmail": "john@example.com"
}
```

**Response:**
- Status: `204 No Content`
- Body: (empty)
- Behavior: Fire-and-forget logging, returns immediately

**Logged Data (CloudWatch):**
```json
{
  "event": "stock_search",
  "userId": "auth0|123456789",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "symbol": "AAPL",
  "timestamp": "2025-11-14T10:30:45.123Z",
  "requestId": "abc-123-def-456"
}
```

## Environment Variables

| Name             | Description                                    | Required |
|------------------|------------------------------------------------|----------|
| `ALLOWED_ORIGIN` | CORS origin (e.g., `https://your-domain.com`) | Yes      |

**Example:**
```bash
ALLOWED_ORIGIN=https://prismfin.example.com
```

For local development:
```json
// env.local.json
{
  "StockInsightsFunction": {
    "ALLOWED_ORIGIN": "http://localhost:5173"
  }
}
```

## Deployment

### Prerequisites

1. [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) installed
2. AWS credentials configured (`aws configure`)
3. Node.js 18+ and pnpm installed

### Steps

1. **Install dependencies**
   ```bash
   cd backend
   pnpm install
   ```

2. **Build**
   ```bash
   sam build
   ```

3. **Deploy**
   ```bash
   sam deploy --guided
   ```

   During guided deployment, you'll be asked:
   - Stack name (e.g., `stock-insights-backend`)
   - AWS Region (e.g., `us-east-1`)
   - `AllowedOrigin` parameter (e.g., `https://your-frontend-domain.com`)
   - Confirm IAM role creation
   - Allow SAM CLI to save configuration

4. **Get API URL**
   After deployment, note the `ApiUrl` output:
   ```
   Outputs:
     ApiUrl: https://abc123.execute-api.us-east-1.amazonaws.com/Prod
     LogGroup: /aws/lambda/StockInsightsFunction
   ```

5. **Update Frontend**
   Set the API URL in your frontend `.env` file:
   ```bash
   VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/Prod
   ```

### Updating Deployment

After making code changes:

```bash
sam build && sam deploy
```

### Deleting Stack

To remove all resources:

```bash
sam delete --stack-name stock-insights-backend
```

## Local Testing

### Start Local API Server

```bash
sam local start-api --env-vars env.local.json
```

This starts a local server at `http://127.0.0.1:3000`.

**Create `env.local.json`:**
```json
{
  "StockInsightsFunction": {
    "ALLOWED_ORIGIN": "http://localhost:5173"
  }
}
```

**Update Frontend for Local Development:**
```bash
# In frontend .env.local
VITE_API_BASE_URL=http://127.0.0.1:3000
```

### Test the Endpoint

```bash
curl -X POST http://127.0.0.1:3000/stocks/search \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{"symbol":"AAPL","userName":"Test User","userEmail":"test@example.com"}'
```

Expected response: `204 No Content`

Check logs:
```bash
# Logs appear in the terminal where you ran sam local start-api
```

## Viewing Logs in Production

### CloudWatch Logs

1. Open AWS Console → CloudWatch → Log Groups
2. Find `/aws/lambda/StockInsightsFunction`
3. View log streams

### Query Logs with CloudWatch Insights

```sql
fields @timestamp, userId, userName, userEmail, symbol
| filter event = "stock_search"
| sort @timestamp desc
| limit 100
```

**Popular queries:**

Most searched stocks:
```sql
fields symbol, count(*) as searchCount
| filter event = "stock_search"
| stats count(*) by symbol
| sort searchCount desc
| limit 10
```

Most active users:
```sql
fields userName, count(*) as searches
| filter event = "stock_search"
| stats count(*) by userName
| sort searches desc
| limit 10
```

Searches by time:
```sql
fields @timestamp, userName, symbol
| filter event = "stock_search"
| sort @timestamp desc
```

## IAM Permissions

The Lambda function requires minimal permissions:

```yaml
Policies:
  - AWSLambdaBasicExecutionRole  # CloudWatch Logs only
```

**What permissions are needed:**
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`

## Cost Estimates

This backend is **extremely cost-effective**:

### AWS Lambda
- **Free Tier**: 1M requests/month, 400,000 GB-seconds/month
- **After Free Tier**: $0.20 per 1M requests
- **Memory**: 128 MB (minimal)
- **Typical cost**: ~$0.00 for most usage

### API Gateway
- **Free Tier**: 1M API calls/month (first 12 months)
- **After Free Tier**: $3.50 per million requests
- **Typical cost**: <$1/month for moderate usage

### CloudWatch Logs
- **Ingestion**: $0.50 per GB
- **Storage**: $0.03 per GB/month
- **Typical cost**: <$0.10/month for logs

**Total monthly cost for 10,000 searches**: < $0.50

## Architecture Decisions

### Why So Minimal?

1. **User-Provided API Keys**: Users manage their own Alpha Vantage API keys, so no proxying needed
2. **Alpha Vantage Rate Limits**: Alpha Vantage enforces their own limits (5/min, 500/day)
3. **Client-Side Caching**: 24-hour cache in browser reduces redundant calls
4. **Cost Optimization**: No DynamoDB, no Secrets Manager = minimal AWS costs
5. **Simplicity**: Easy to understand, deploy, and maintain

### Alternative: Full-Featured Backend

For a production application requiring strict rate limiting, you might want:
- DynamoDB for rate limiting state
- Secrets Manager for shared API keys
- Backend proxying of Alpha Vantage calls
- Server-side caching (Redis/ElastiCache)

However, this significantly increases complexity and cost. The current architecture is ideal for:
- Personal projects
- Small user bases
- Cost-sensitive applications
- When users can manage their own API keys

## Troubleshooting

### CORS Errors

**Problem:** Frontend shows CORS errors when calling backend

**Solution:**
1. Verify `ALLOWED_ORIGIN` matches your frontend URL exactly
2. Include protocol (https://) in `ALLOWED_ORIGIN`
3. Don't add trailing slash to `ALLOWED_ORIGIN`
4. Redeploy after changing: `sam build && sam deploy`

### 401 Unauthorized

**Problem:** Backend returns 401 for all requests

**Solution:**
1. Ensure frontend passes `X-User-Id` header (or Auth0 JWT)
2. For local testing, pass `X-User-Id` header manually
3. Check CloudWatch Logs for "unauthorized_search_attempt" events

### Logs Not Appearing

**Problem:** Searches work but logs don't appear in CloudWatch

**Solution:**
1. Wait a few minutes (CloudWatch can have slight delay)
2. Check Lambda execution role has CloudWatch Logs permissions
3. View Lambda function logs directly in AWS Console
4. Ensure `console.log()` statements are present in handler

### High Latency

**Problem:** Backend responses are slow

**Solution:**
1. The backend returns 204 immediately (should be <100ms)
2. Check API Gateway CloudWatch metrics
3. Consider using VPC if network isolation is required
4. Cold starts are minimal (128 MB memory, simple function)

## Monitoring

### Key Metrics to Watch

1. **Invocations**: Total number of searches logged
2. **Errors**: Should be near zero
3. **Duration**: Should be <100ms (fire-and-forget logging)
4. **Throttles**: Should be zero (no rate limiting)

### Setting Up Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name stock-insights-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=StockInsightsFunction
```

## Security

See [SECURITY.md](../SECURITY.md) for detailed security considerations.

**Quick checklist:**
- [ ] `ALLOWED_ORIGIN` set to production domain only
- [ ] CloudWatch Logs encryption enabled (optional)
- [ ] Log retention policy configured (e.g., 30 days)
- [ ] IAM role follows least privilege principle

## Support

For issues or questions:
1. Check CloudWatch Logs for error details
2. Verify environment variables are set correctly
3. Test with `curl` to isolate frontend vs backend issues
4. Review [main README](../README.md) for overall architecture

## License

See [LICENSE](../LICENSE) for details.
