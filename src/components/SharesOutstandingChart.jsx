import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTimeframeLabel } from '../utils/fetchAlphaVantage';

const SharesOutstandingChart = ({ data, timeframe = 'Quarterly' }) => {
  // Select appropriate data based on timeframe
  const isAnnual = timeframe.toLowerCase().includes('annual');
  const sourceData = isAnnual ? (data?.annual || []) : (data?.quarterly || []);
  
  if (!sourceData || sourceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Shares Outstanding</span>
            <span className="text-sm text-muted-foreground">{timeframe}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No shares outstanding data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = sourceData.map(item => ({
    date: item.date || item.calendarYear,
    quarter: formatTimeframeLabel(item.date, isAnnual),
    sharesOutstanding: item.weightedAverageShsOut || item.commonStockSharesOutstanding || 0,
    sharesInBillions: (item.weightedAverageShsOut || item.commonStockSharesOutstanding || 0) / 1000000000 // Convert to billions
  })).filter(item => item.sharesOutstanding > 0);

  // Calculate metrics
  const latestShares = chartData[chartData.length - 1]?.sharesOutstanding || 0;
  const previousShares = chartData[chartData.length - 2]?.sharesOutstanding || 0;
  const change = latestShares - previousShares;
  const changePercent = previousShares > 0 ? (change / previousShares) * 100 : 0;
  const growth = changePercent;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.quarter}</p>
          <p className="text-sm text-teal-600">
            Shares: {data.sharesInBillions.toFixed(2)}B
          </p>
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
            <span>Shares Outstanding</span>
            {changePercent !== 0 && (
              <span className={`text-sm ${changePercent <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {changePercent <= 0 ? '' : '+'}{changePercent.toFixed(1)}%
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
                tickFormatter={(value) => `${value.toFixed(1)}B`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="sharesInBillions" 
                fill="#14b8a6"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latest {isAnnual ? 'Year' : 'Quarter'}</p>
              <p className="font-semibold text-indigo-600">
                {(latestShares / 1000000000).toFixed(2)}B
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{isAnnual ? 'YoY' : 'QoQ'} Growth</p>
              <p className={`font-semibold ${growth >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total {isAnnual ? 'Years' : 'Quarters'}</p>
              <p className="font-semibold">
                {chartData.length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharesOutstandingChart;

