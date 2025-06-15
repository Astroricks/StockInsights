import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTimeframeLabel } from '../utils/fetchAlphaVantage';

const DividendsChart = ({ data, timeframe = 'Quarterly' }) => {
  if (!data || (!data.quarterly && !data.annual) || 
      (data.quarterly && data.quarterly.length === 0 && data.annual && data.annual.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dividends</span>
            <span className="text-sm text-muted-foreground">{timeframe}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No dividend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use annual or quarterly data based on timeframe
  const isAnnual = timeframe.toLowerCase().includes('annual');
  const sourceData = isAnnual ? (data.annual || []) : (data.quarterly || []);

  // Format data for chart
  const chartData = sourceData.map(item => {
    if (isAnnual) {
      return {
        date: item.year ? item.year.toString() : 'Unknown',
        quarter: item.year ? item.year.toString() : 'Unknown',
        dividend: item.totalDividend || 0,
        dividendCount: item.dividendCount || 0
      };
    } else {
      return {
        date: item.date || 'Unknown',
        quarter: item.date ? formatTimeframeLabel(item.date) : 'Unknown',
        dividend: item.dividendAmount || 0,
        declarationDate: item.declarationDate
      };
    }
  }).filter(item => item.dividend > 0 && item.date !== 'Unknown');

  // Calculate metrics
  const latestDividend = chartData[chartData.length - 1]?.dividend || 0;
  const previousDividend = chartData[chartData.length - 2]?.dividend || 0;
  const growth = previousDividend > 0 ? ((latestDividend - previousDividend) / previousDividend) * 100 : 0;
  const totalDividends = chartData.reduce((sum, item) => sum + item.dividend, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.quarter}</p>
          <p className="text-sm text-purple-600">
            {isAnnual ? 
              `Total Dividends: $${data.dividend.toFixed(2)} (${data.dividendCount} payments)` :
              `Dividend: $${data.dividend.toFixed(2)}`
            }
          </p>
          {data.declarationDate && (
            <p className="text-xs text-muted-foreground">
              Declared: {new Date(data.declarationDate).toLocaleDateString()}
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
            <span>Dividends</span>
            {growth !== 0 && (
              <span className={`text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{timeframe}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="dividend" 
                fill="#8b5cf6"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latest {isAnnual ? 'Year' : 'Quarter'}</p>
              <p className="font-semibold text-purple-600">
                ${latestDividend.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Growth</p>
              <p className={`font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Period</p>
              <p className="font-semibold">
                ${totalDividends.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DividendsChart; 