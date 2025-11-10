import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

// Financial term explanations
const FINANCIAL_TERMS = {
  'Revenue': {
    title: 'Revenue',
    description: 'Revenue (also called sales or turnover) is the total amount of money a company receives from selling its products or services. It represents the top line of a company\'s income statement and shows how much money the business generates before any expenses are deducted.',
    example: 'If a company sells 1,000 units at $100 each, its revenue is $100,000.'
  },
  'EBITDA': {
    title: 'EBITDA',
    description: 'EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization. It measures a company\'s operating performance by showing profitability from core business operations, excluding the effects of financing decisions, tax environments, and accounting practices.',
    example: 'EBITDA helps compare companies in the same industry regardless of their capital structure or tax situations.'
  },
  'Free Cash Flow': {
    title: 'Free Cash Flow',
    description: 'Free Cash Flow (FCF) is the cash a company generates after accounting for capital expenditures (money spent on maintaining or expanding assets). It represents the cash available for dividends, debt repayment, stock buybacks, or reinvestment in the business.',
    example: 'Positive free cash flow means the company has money left over after paying for operations and investments, which is a sign of financial health.'
  },
  'Net Income': {
    title: 'Net Income',
    description: 'Net Income (also called profit or earnings) is the amount of money a company has left after subtracting all expenses, taxes, and costs from its total revenue. It\'s the "bottom line" and represents actual profit.',
    example: 'If a company has $1M in revenue and $800K in expenses, its net income is $200K.'
  },
  'EPS': {
    title: 'Earnings Per Share (EPS)',
    description: 'EPS measures how much profit a company makes for each share of its stock. It\'s calculated by dividing net income by the number of outstanding shares. Higher EPS generally indicates better profitability per share.',
    example: 'If a company has $1M in net income and 1M shares, its EPS is $1.00 per share.'
  },
  'Cash & Debt': {
    title: 'Cash & Debt',
    description: 'This shows a company\'s cash position versus its total debt. Cash represents liquid assets available, while debt includes loans and bonds. A healthy company typically has enough cash to cover short-term obligations and manageable debt levels.',
    example: 'A company with $10B in cash and $5B in debt has a strong financial position.'
  },
  'Shares Outstanding': {
    title: 'Shares Outstanding',
    description: 'The total number of shares of a company\'s stock that are currently owned by all shareholders, including institutional investors and company insiders. Changes in this number can indicate stock buybacks (reduction) or new share issuance (increase).',
    example: 'If a company buys back shares, the number of shares outstanding decreases, which can increase the value of remaining shares.'
  },
  'Dividends': {
    title: 'Dividends',
    description: 'Dividends are regular payments made by a company to its shareholders from profits. They represent a portion of earnings distributed to investors as a return on their investment. Dividend-paying stocks are often considered more stable investments.',
    example: 'If a company pays $0.50 per share quarterly and you own 100 shares, you receive $50 every quarter.'
  },
  'Price': {
    title: 'Stock Price',
    description: 'The current market price of a single share of a company\'s stock. Stock prices fluctuate based on supply and demand, company performance, market conditions, and investor sentiment. Historical price trends can indicate company growth or decline.',
    example: 'A rising stock price over time generally indicates positive investor confidence and company growth.'
  }
};

const InfoButton = ({ term }) => {
  const termData = FINANCIAL_TERMS[term];
  
  if (!termData) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3 w-3 text-muted-foreground" />
          <span className="sr-only">Learn more about {term}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="right" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{termData.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {termData.description}
          </p>
          {termData.example && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">Example:</p>
              <p className="text-xs text-muted-foreground italic">
                {termData.example}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InfoButton;

