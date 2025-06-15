# Stock Research App - Deployment Guide

## Quick Start

1. **Set your API key** in `src/utils/fetchFinnhub.js`:
   ```javascript
   const API_KEY = 'your_finnhub_api_key_here';
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start development server**:
   ```bash
   pnpm run dev
   ```

## Production Deployment

### Option 1: AWS S3 + CloudFront (Recommended)

1. **Build the application**:
   ```bash
   pnpm run build
   ```

2. **Upload to S3**:
   - Create an S3 bucket
   - Enable static website hosting
   - Upload all files from the `dist/` folder
   - Set `index.html` as the index document

3. **Set up CloudFront**:
   - Create a CloudFront distribution
   - Point origin to your S3 bucket
   - Configure custom error pages (404 → index.html)

### Option 2: AWS Amplify

1. **Connect repository**:
   - Push code to GitHub/GitLab
   - Connect to AWS Amplify
   - Amplify will auto-build and deploy

2. **Build settings** (amplify.yml):
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
   ```

### Option 3: Vercel/Netlify

1. **Connect repository** to Vercel or Netlify
2. **Set build command**: `pnpm run build`
3. **Set publish directory**: `dist`
4. **Deploy automatically** on git push

## Environment Variables

For production, consider using environment variables for the API key:

1. **Create `.env` file**:
   ```
   VITE_FINNHUB_API_KEY=your_api_key_here
   ```

2. **Update fetchFinnhub.js**:
   ```javascript
   const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || 'YOUR_API_KEY';
   ```

3. **Set environment variables** in your deployment platform

## Performance Optimization

The build includes some large chunks. For better performance:

1. **Code splitting** - Consider lazy loading components
2. **Bundle analysis** - Use `pnpm run build --analyze`
3. **CDN** - Use CloudFront or similar for global distribution

## Security Notes

- Never commit API keys to version control
- Use environment variables in production
- Consider implementing rate limiting on your domain
- Monitor API usage to avoid exceeding limits

## Monitoring

- Set up error tracking (Sentry, LogRocket)
- Monitor API usage in Finnhub dashboard
- Use analytics to track user behavior

## Support

- Check browser console for errors
- Verify API key is correctly set
- Ensure Finnhub account is active
- Test with different stock symbols

