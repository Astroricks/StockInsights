import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-lg mb-2">1. Data Collection</h3>
              <p className="text-muted-foreground mb-2">
                PrismFin Insights collects minimal data necessary to provide our service:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>User authentication information (via Auth0) including name and email</li>
                <li>Stock search queries (logged for analytics purposes)</li>
                <li>Alpha Vantage API keys (stored locally in your browser, never on our servers)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">2. Data Storage</h3>
              <p className="text-muted-foreground">
                Your Alpha Vantage API key is stored exclusively in your browser's local storage. 
                We do not store, transmit, or have access to your API keys on our servers.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">3. Data Usage</h3>
              <p className="text-muted-foreground">
                We use your information solely to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Provide stock analysis and financial insights</li>
                <li>Log search queries for service improvement (stored in AWS CloudWatch Logs)</li>
                <li>Authenticate your account and provide personalized features</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">4. Data Sharing and Selling</h3>
              <p className="text-muted-foreground font-semibold text-foreground">
                <strong>We do not sell, rent, or share your personal data with third parties.</strong>
              </p>
              <p className="text-muted-foreground mt-2">
                Your data is only used internally for service operation and is never shared with advertisers, 
                data brokers, or any third-party services except:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Auth0 (for authentication services)</li>
                <li>AWS CloudWatch (for logging search queries)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">5. Third-Party Services</h3>
              <p className="text-muted-foreground">
                We use the following third-party services:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><strong>Auth0:</strong> Handles user authentication. See their privacy policy at <a href="https://auth0.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">auth0.com/privacy</a></li>
                <li><strong>Alpha Vantage:</strong> Provides financial data. Your API key is used directly from your browser to call their API.</li>
                <li><strong>AWS CloudWatch:</strong> Stores search logs for analytics purposes.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">6. Your Rights</h3>
              <p className="text-muted-foreground">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Access your personal data</li>
                <li>Delete your account and associated data</li>
                <li>Opt out of data collection (by not using authenticated features)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise these rights, contact us at{' '}
                <a href="mailto:prismfininsights@gmail.com" className="text-primary hover:underline">
                  prismfininsights@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">7. Cookies and Local Storage</h3>
              <p className="text-muted-foreground">
                We use browser local storage to store your API key and cached financial data. 
                This data remains on your device and is not transmitted to our servers except 
                when making API calls to Alpha Vantage (using your API key).
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-lg mb-2">8. Contact Us</h3>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:prismfininsights@gmail.com" className="text-primary hover:underline">
                  prismfininsights@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

