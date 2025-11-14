# PrismFin Insights - Deployment Guide

Complete guide for deploying the Stock Insights application to production.

## Architecture Overview

```
┌──────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                  │         │                  │         │                 │
│   React SPA      │────────>│   Auth0          │         │  Alpha Vantage  │
│   (Frontend)     │  Auth   │   (OAuth)        │         │     API         │
│                  │         │                  │         │                 │
└────────┬─────────┘         └──────────────────┘         └────────▲────────┘
         │                                                         │
         │ Log search                                      Direct API calls
         │ (fire-and-forget)                              (user's API key)
         │                                                         │
         │ ────────────────────────────────────────────────────────┘
         ▼            
┌──────────────────┐ 
│                  │ 
│  AWS Lambda      │ 
│  + API Gateway   │ 
│  (Backend)       │ 
│                  │ 
└────────┬─────────┘ 
         │           
         ▼           
┌──────────────────┐ 
│                  │ 
│  CloudWatch      │
│  Logs            │
│                  │
└──────────────────┘
```

## Prerequisites

1. **AWS Account** with CLI configured
2. **Auth0 Account** (free tier is sufficient)
3. **Alpha Vantage API Key** (free tier, for IBM demo)
4. **Node.js 18+** and **pnpm** installed
5. **AWS SAM CLI** for backend deployment
6. **Domain name** (optional, for custom domain)

## Step 1: Auth0 Setup

### Create Auth0 Application

1. Log in to [Auth0 Dashboard](https://manage.auth0.com/)
2. Go to **Applications** → **Create Application**
3. Choose **Single Page Web Applications**
4. Note your:
   - Domain (e.g., `dev-xxxxxx.us.auth0.com`)
   - Client ID

### Configure Application Settings

In your Auth0 application settings:

**Allowed Callback URLs:**
```
http://localhost:5173/StockInsights/,
https://your-production-domain.com/StockInsights/
```

**Allowed Logout URLs:**
```
http://localhost:5173/StockInsights/,
https://your-production-domain.com/StockInsights/
```

**Allowed Web Origins:**
```
http://localhost:5173,
https://your-production-domain.com
```

**Allowed Origins (CORS):**
```
http://localhost:5173,
https://your-production-domain.com
```

## Step 2: Backend Deployment

### Deploy to AWS Lambda

```bash
cd backend
pnpm install
sam build
sam deploy --guided
```

**Deployment parameters:**
- **Stack Name**: `stock-insights-backend`
- **AWS Region**: `us-east-1` (or your preferred region)
- **AllowedOrigin**: `https://your-production-domain.com`
- Confirm IAM role creation: `y`
- Allow SAM CLI to save config: `y`

### Note the API URL

After deployment:
```
Outputs:
  ApiUrl: https://abc123.execute-api.us-east-1.amazonaws.com/Prod
  LogGroup: /aws/lambda/StockInsightsFunction
```

Save the `ApiUrl` - you'll need it for frontend configuration.

## Step 3: Frontend Configuration

### Create Production Config Files

**1. Create `src/auth_config.json`:**

```json
{
  "domain": "dev-xxxxxx.us.auth0.com",
  "clientId": "YOUR_AUTH0_CLIENT_ID",
  "redirectUri": "https://your-production-domain.com/StockInsights/",
  "logoutReturnTo": "https://your-production-domain.com/StockInsights/"
}
```

> ⚠️ **Never commit this file!** Verify it's in `.gitignore`.

**2. Create `.env.production`:**

```bash
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/Prod
```

### Build Frontend

```bash
pnpm install
pnpm run build
```

This creates a `dist/` folder with optimized production files.

## Step 4: Frontend Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended)

**Benefits:**
- Low cost (~$1-5/month)
- Global CDN
- HTTPS with ACM certificates
- Custom domain support

**Steps:**

1. **Create S3 Bucket**
```bash
aws s3 mb s3://your-bucket-name --region us-east-1
```

2. **Enable Static Website Hosting**
```bash
aws s3 website s3://your-bucket-name \
  --index-document index.html \
  --error-document index.html
```

3. **Upload Build Files**
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

4. **Create CloudFront Distribution**
```bash
# Via AWS Console or AWS CLI
# Point origin to S3 bucket
# Configure custom error pages: 404 -> /index.html (for SPA routing)
# Request SSL certificate via ACM (if using custom domain)
```

5. **Configure Custom Domain (Optional)**
   - Add CNAME record pointing to CloudFront distribution
   - Update Auth0 URLs to use custom domain
   - Update backend `ALLOWED_ORIGIN` to custom domain

### Option 2: AWS Amplify

**Benefits:**
- Automatic CI/CD from git
- Built-in hosting and SSL
- Easy branch previews

**Steps:**

1. **Push code to GitHub/GitLab/Bitbucket**

2. **Connect to Amplify**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click **New app** → **Host web app**
   - Connect your repository

3. **Configure Build Settings**

Create `amplify.yml` in project root:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm
        - pnpm install
    build:
      commands:
        - pnpm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

4. **Add Environment Variables**

In Amplify Console → App Settings → Environment variables:
```
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/Prod
```

5. **Deploy**
   - Amplify auto-deploys on git push
   - Get your Amplify domain (e.g., `https://main.xxxxx.amplifyapp.com`)

6. **Update Auth0 URLs** with your Amplify domain

### Option 3: Vercel

**Benefits:**
- Fastest deployment
- Excellent developer experience
- Automatic HTTPS

**Steps:**

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Configure Environment Variables**

In Vercel Dashboard → Project Settings → Environment Variables:
```
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/Prod
```

4. **Update Auth0 URLs** with your Vercel domain

### Option 4: Netlify

**Steps:**

1. **Connect Repository** at [netlify.com](https://www.netlify.com/)

2. **Build Settings**
   - Build command: `pnpm run build`
   - Publish directory: `dist`
   - Environment variables:
     ```
     VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/Prod
     ```

3. **Update Auth0 URLs** with your Netlify domain

## Step 5: Update Auth0 for Production

Once you have your production URL:

1. Update **Allowed Callback URLs** to include production URL
2. Update **Allowed Logout URLs**
3. Update **Allowed Web Origins**
4. Update `src/auth_config.json` with production URL
5. Rebuild and redeploy frontend

## Step 6: Update Backend CORS

Update backend to only allow production domain:

```bash
sam deploy --parameter-overrides AllowedOrigin=https://your-production-domain.com
```

## Step 7: Configure Demo API Key (Optional)

For the IBM demo to work, users need to use the 'demo' API key (or their own). Consider documenting this in your app or providing a shared demo key for anonymous users.

## Post-Deployment Checklist

- [ ] Frontend accessible at production URL
- [ ] Auth0 login works
- [ ] User can save API key in settings
- [ ] IBM demo stock works without login
- [ ] Search logging works (check CloudWatch)
- [ ] CORS configured correctly (no errors in browser console)
- [ ] HTTPS enabled
- [ ] Custom domain configured (if applicable)
- [ ] All URLs updated in Auth0
- [ ] `auth_config.json` not committed to git

## Monitoring & Operations

### CloudWatch Logs

View user search activity:
```bash
aws logs tail /aws/lambda/StockInsightsFunction --follow
```

### CloudWatch Insights Queries

Most searched stocks:
```sql
fields symbol, count(*) as searches
| filter event = "stock_search"
| stats count(*) by symbol
| sort searches desc
| limit 10
```

### Set Up Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name stock-insights-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### Cost Monitoring

Expected monthly costs (for ~1000 users, 10,000 searches):
- **Lambda**: Free tier (likely $0)
- **API Gateway**: ~$0.04
- **CloudWatch Logs**: ~$0.10
- **S3 + CloudFront**: ~$1-5
- **Total**: < $10/month

## CI/CD Setup (Optional)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/setup-sam@v2
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: |
          cd backend
          sam build
          sam deploy --no-confirm-changeset --no-fail-on-empty-changeset

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: aws s3 sync dist/ s3://your-bucket-name --delete
```

## Troubleshooting

### Auth0 Login Fails

- Check callback URLs in Auth0 match exactly
- Verify `auth_config.json` domain and clientId
- Check browser console for errors

### CORS Errors

- Verify backend `ALLOWED_ORIGIN` matches frontend URL exactly
- Include protocol (https://) and exclude trailing slash
- Redeploy backend after changing CORS settings

### API Calls Fail

- Check Alpha Vantage API key is configured
- Verify rate limits (5/min, 500/day)
- Check browser network tab for error details

### Backend Not Logging

- Verify Lambda has CloudWatch Logs permissions
- Check Lambda execution role
- Wait a few minutes (CloudWatch can have delay)

## Security Hardening

Before going live:

1. **Enable CloudWatch Logs Encryption**
```bash
aws logs put-resource-policy \
  --policy-name StockInsightsEncryption \
  --policy-document file://log-encryption-policy.json
```

2. **Set Log Retention**
```bash
aws logs put-retention-policy \
  --log-group-name /aws/lambda/StockInsightsFunction \
  --retention-in-days 30
```

3. **Enable WAF** (if using CloudFront)
   - Protect against common attacks
   - Rate limiting at CDN level
   - Geographic restrictions if needed

4. **Review IAM Permissions**
   - Ensure Lambda has minimal permissions
   - Use separate AWS accounts for dev/prod

## Updating Deployment

### Frontend Updates

```bash
pnpm run build
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Backend Updates

```bash
cd backend
sam build && sam deploy
```

## Rollback Procedures

### Frontend Rollback

If using S3:
```bash
# Sync previous build
aws s3 sync previous-dist/ s3://your-bucket-name --delete
```

### Backend Rollback

```bash
sam deploy --parameter-overrides Version=previous-version
```

Or use AWS Console → CloudFormation → Stack → Update → Previous template

## Performance Optimization

1. **CloudFront Caching**
   - Cache static assets (CSS, JS, images)
   - Set appropriate TTLs

2. **Frontend Optimization**
   - Already includes code splitting
   - Lazy loading of chart components
   - 24-hour data cache in localStorage

3. **Backend Optimization**
   - Already minimal (128 MB memory)
   - Fire-and-forget logging
   - No database queries

## Support & Maintenance

- Monitor CloudWatch Logs daily for errors
- Check AWS Cost Explorer weekly
- Review user search patterns monthly
- Update dependencies quarterly
- Renew SSL certificates annually (if self-managed)

## Additional Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Auth0 Documentation](https://auth0.com/docs)
- [Alpha Vantage API Docs](https://www.alphavantage.co/documentation/)
- [React Deployment Guide](https://react.dev/learn/start-a-new-react-project#deploying-to-production)

## License

See [LICENSE](./LICENSE) for details.
