# Security Considerations

## Current Architecture Overview

This application uses a **user-provided API key** model where each user supplies their own Alpha Vantage API key, which is:
- Stored in browser `localStorage` (user-specific, tied to Auth0 user ID)
- Used directly from the frontend to call Alpha Vantage APIs
- Not shared between users
- Not stored on any backend server

## Security Model

### ✅ What IS Secure

1. **User Isolation**
   - Each user's API key is stored separately using their Auth0 user ID as the key
   - Switching users automatically loads the correct API key
   - No API key sharing between users

2. **Authentication**
   - Auth0 provides secure user authentication
   - JWT tokens for session management
   - Industry-standard OAuth 2.0 / OpenID Connect

3. **HTTPS**
   - All API calls to Alpha Vantage use HTTPS
   - Auth0 communication is encrypted
   - Production deployment should use HTTPS

4. **No Backend API Key Storage**
   - Backend doesn't store or manage user API keys
   - No risk of centralized API key theft
   - Users are responsible for their own keys

### ⚠️ Security Limitations

1. **localStorage is Not Encrypted**
   - API keys are stored in plain text in `localStorage`
   - Anyone with physical access to the device can read them
   - Browser extensions can potentially access `localStorage`
   - **Mitigation**: This is acceptable because:
     - Alpha Vantage API keys are free
     - Keys can be rotated easily
     - Users control their own keys
     - Rate limits are per-key, limiting potential abuse

2. **Client-Side API Calls**
   - API keys are exposed in browser network traffic
   - Technically visible in browser DevTools
   - **Mitigation**: This is the intended design
     - Alpha Vantage allows client-side calls
     - Rate limiting is enforced by Alpha Vantage (5 calls/min, 500/day)
     - Users can monitor their own usage

3. **No Server-Side Rate Limiting**
   - The application doesn't enforce custom rate limits
   - Users are subject to Alpha Vantage's own rate limits
   - **Mitigation**: 
     - 24-hour cache reduces redundant calls
     - Alpha Vantage enforces their own limits
     - Each user is responsible for their own quota

### Backend Security

The backend is **ultra-minimal** and only logs user searches to CloudWatch for analytics:

1. **What the Backend Does**:
   - Receives search logs (ticker, user ID, user name, user email, timestamp)
   - Writes structured JSON logs to CloudWatch
   - Returns immediately (fire-and-forget)

2. **What the Backend Does NOT Do**:
   - Store or handle API keys
   - Proxy Alpha Vantage API calls
   - Enforce rate limiting
   - Store any user data in databases

3. **Backend Security Measures**:
   - CORS protection (only allows configured origin)
   - Minimal attack surface (single logging endpoint)
   - No database dependencies
   - Stateless Lambda function

## Best Practices for Users

### For End Users

1. **Protect Your API Key**
   - Don't share your API key with others
   - Don't commit your API key to version control
   - Rotate your key if you suspect it's compromised

2. **Monitor Your Usage**
   - Check Alpha Vantage dashboard for usage stats
   - Be aware of the 5 calls/min, 500 calls/day limits
   - Use cached data when available (24-hour cache)

3. **Secure Your Device**
   - Use device passwords/biometrics
   - Be cautious on shared computers
   - Log out when done on public devices

### For Developers/Admins

1. **Auth0 Configuration**
   - Keep `auth_config.json` out of version control (`.gitignore`)
   - Use environment variables for production secrets
   - Configure proper callback URLs
   - Enable MFA for Auth0 dashboard access

2. **Production Deployment**
   - Deploy frontend on HTTPS-only
   - Configure CORS properly in backend
   - Use AWS IAM roles for Lambda execution
   - Enable CloudWatch Logs encryption

3. **Monitoring**
   - Monitor CloudWatch logs for unusual patterns
   - Set up alerts for backend errors
   - Track user search patterns for abuse

## Sensitive Files (Must Not Commit)

These files contain sensitive information and must be excluded from version control:

```
src/auth_config.json          # Auth0 credentials
.env                          # Frontend environment variables
.env.local                    # Local development overrides
backend/env.local.json        # Backend local development config
```

Verify they're in `.gitignore`:
```bash
grep -E "(auth_config\.json|\.env)" .gitignore
```

## Threat Model

### Low Risk

- **API Key Theft from localStorage**: Free keys, easy to rotate, limited impact
- **Excessive API Usage**: Alpha Vantage enforces their own limits
- **Search Log Exposure**: Logs contain no sensitive financial data

### Medium Risk

- **Auth0 Configuration Exposure**: Could allow unauthorized access
- **CORS Misconfiguration**: Could expose backend to unauthorized domains
- **CloudWatch Log Data**: Contains user emails/names (PII)

### Mitigations

1. **Never commit `auth_config.json`** to version control
2. **Configure backend `ALLOWED_ORIGIN`** to production domain only
3. **Enable CloudWatch Logs encryption** at rest
4. **Set log retention policies** to comply with privacy regulations

## Compliance Considerations

### Data Storage

- **Frontend**: API keys in localStorage (user-controlled)
- **Backend**: User IDs, names, emails, search queries in CloudWatch Logs

### GDPR/Privacy

- Users can clear their API keys by clicking "Remove Key" in settings
- CloudWatch logs should have retention policies (e.g., 30 days)
- Consider adding privacy policy and terms of service

### Recommendations

1. Add privacy policy explaining data collection
2. Implement log retention policies
3. Provide user data export/deletion mechanisms if required
4. Consider encrypting CloudWatch logs

## Security Checklist for Production

- [ ] `auth_config.json` excluded from git
- [ ] Production uses HTTPS
- [ ] Backend CORS configured to production domain only
- [ ] CloudWatch Logs encryption enabled
- [ ] Log retention policy configured
- [ ] Auth0 application settings reviewed
- [ ] No hardcoded secrets in code
- [ ] Environment variables used for all secrets
- [ ] Regular security audits scheduled

## Reporting Security Issues

If you discover a security vulnerability, please email security@yourcompany.com (replace with your contact) rather than opening a public issue.