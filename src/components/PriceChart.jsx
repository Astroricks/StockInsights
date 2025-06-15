import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const PriceChart = ({ data, ticker, timeframe = '1Y' }) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Price</span>
            <span className="text-sm text-muted-foreground">{timeframe}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No price data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate price change
  const firstPrice = data[0]?.close || 0;
  const lastPrice = data[data.length - 1]?.close || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{new Date(label).toLocaleDateString()}</p>
          <p className="text-sm text-blue-600">
            Close: ${data.close?.toFixed(2)}
          </p>
          {data.change && (
            <p className={`text-sm ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Change: {data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} ({data.changePercent?.toFixed(2)}%)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Price</span>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </div>
          </div>
          <span className="text-sm text-muted-foreground">{timeframe}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (data.length > 520) {
                    // If data spans more than 520 weeks (10 years), show year format
                    return `${date.getFullYear()}`;
                  } else if (data.length > 12) {
                    // If data spans more than a year, show quarter/year format
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    return `Q${quarter} ${date.getFullYear()}`;
                  } else {
                    // For shorter periods, show month/day format
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: isPositive ? "#10b981" : "#ef4444", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current</p>
              <p className="font-semibold">${lastPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Change</p>
              <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}${priceChange.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Range</p>
              <p className="font-semibold">
                ${Math.min(...data.map(d => d.close)).toFixed(2)} - ${Math.max(...data.map(d => d.close)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;

