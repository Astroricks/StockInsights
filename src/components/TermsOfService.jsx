import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TermsOfService = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            <strong>Last Updated:</strong> 11/26/2025
          </p>

          <section>
            <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground">
              By accessing and using PrismFin Insights, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">2. Description of Service</h3>
            <p className="text-muted-foreground">
              PrismFin Insights is a financial data visualization platform that provides stock analysis 
              and financial insights using data from Alpha Vantage. The service allows users to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Search and view financial data for publicly traded stocks</li>
              <li>Visualize financial metrics including revenue, EBITDA, cash flow, and more</li>
              <li>Access historical price data and dividend information</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">3. User Responsibilities</h3>
            <p className="text-muted-foreground mb-2">You agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Provide accurate information when creating an account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use your own Alpha Vantage API key and comply with Alpha Vantage's terms of service</li>
              <li>Not use the service for any illegal or unauthorized purpose</li>
              <li>Not attempt to gain unauthorized access to the service or its related systems</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">4. API Key Usage</h3>
            <p className="text-muted-foreground">
              You are responsible for obtaining and managing your own Alpha Vantage API key. 
              Your API key is stored locally in your browser and is never transmitted to our servers 
              except when making direct API calls to Alpha Vantage. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Complying with Alpha Vantage's rate limits and terms of service</li>
              <li>Keeping your API key secure and not sharing it with others</li>
              <li>Any charges or fees associated with your Alpha Vantage API usage</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">5. Data and Information</h3>
            <p className="text-muted-foreground">
              Financial data provided by PrismFin Insights is sourced from Alpha Vantage and is provided 
              "as is" without warranty of any kind. We do not guarantee the accuracy, completeness, or 
              timeliness of the financial data. You should not rely solely on this information for making 
              investment decisions.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">6. Disclaimer of Warranties</h3>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
              FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">7. Limitation of Liability</h3>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PRISMFIN INSIGHTS SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS 
              OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, 
              OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">8. Investment Advice Disclaimer</h3>
            <p className="text-muted-foreground font-semibold text-foreground">
              <strong>PrismFin Insights does not provide investment, financial, or trading advice.</strong>
            </p>
            <p className="text-muted-foreground mt-2">
              The information provided on this platform is for informational purposes only and should not 
              be construed as investment advice. Always consult with a qualified financial advisor before 
              making investment decisions.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">9. Modifications to Service</h3>
            <p className="text-muted-foreground">
              We reserve the right to modify, suspend, or discontinue the service at any time without 
              prior notice. We shall not be liable to you or any third party for any modification, 
              suspension, or discontinuance of the service.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">10. Changes to Terms</h3>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes by updating the "Last Updated" date. Your continued use of the service 
              after such changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">11. Contact Information</h3>
            <p className="text-muted-foreground">
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:prismfininsights@gmail.com" className="text-primary hover:underline">
                prismfininsights@gmail.com
              </a>
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsOfService;

