import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StockQuote = ({ quote, ticker }) => {
  if (!quote) return null;

  const change = quote.d || 0;
  const changePercent = quote.dp || 0;
  const currentPrice = quote.c || 0;
  const previousClose = quote.pc || 0;
  const high = quote.h || 0;
  const low = quote.l || 0;
  const open = quote.o || 0;

  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const getIcon = () => {
    if (isPositive) return <TrendingUp className="h-5 w-5" />;
    if (isNegative) return <TrendingDown className="h-5 w-5" />;
    return <Minus className="h-5 w-5" />;
  };

  const getColorClass = () => {
    if (isPositive) return 'text-green-600';
    if (isNegative) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{ticker} Quote</span>
          <div className={`flex items-center gap-2 ${getColorClass()}`}>
            {getIcon()}
            <span className="text-lg font-bold">
              ${currentPrice.toFixed(2)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Change</p>
            <p className={`font-semibold ${getColorClass()}`}>
              {change >= 0 ? '+' : ''}${change.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Change %</p>
            <p className={`font-semibold ${getColorClass()}`}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Previous Close</p>
            <p className="font-semibold">${previousClose.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="font-semibold">${open.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Day High</p>
            <p className="font-semibold">${high.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Day Low</p>
            <p className="font-semibold">${low.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockQuote;

