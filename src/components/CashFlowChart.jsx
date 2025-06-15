import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatTimeframeLabel } from '../utils/fetchAlphaVantage';

const CashFlowChart = ({ data, timeframe = 'Quarterly' }) => {
  // Select appropriate data based on timeframe
  const isAnnual = timeframe.toLowerCase().includes('annual');
  const sourceData = isAnnual ? (data?.annual || []) : (data?.quarterly || []);
  
  if (!sourceData || sourceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Free Cash Flow</span>
            <span className="text-sm text-muted-foreground">{timeframe}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No cash flow data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = sourceData.map(item => ({
    date: item.date || item.calendarYear,
    quarter: formatTimeframeLabel(item.date, isAnnual),
    freeCashFlow: item.freeCashFlow || 0,
    cashFlowInMillions: (item.freeCashFlow || 0) / 1000000 // Convert to millions
  })).filter(item => item.freeCashFlow !== null && item.freeCashFlow !== undefined);

  // Calculate metrics
  const latestCashFlow = chartData[chartData.length - 1]?.freeCashFlow || 0;
  const previousCashFlow = chartData[chartData.length - 2]?.freeCashFlow || 0;
  const growth = previousCashFlow !== 0 ? ((latestCashFlow - previousCashFlow) / Math.abs(previousCashFlow)) * 100 : 0;
  const positivePeriods = chartData.filter(d => d.freeCashFlow >= 0).length;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.freeCashFlow;
      const isPositive = value >= 0;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.quarter}</p>
          <p className={`text-sm ${isPositive ? 'text-orange-600' : 'text-red-600'}`}>
            Free Cash Flow: {isPositive ? '$' : '-$'}{Math.abs(value / 1000000).toFixed(0)}M
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
            <span>Free Cash Flow</span>
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
                tickFormatter={(value) => `$${value.toFixed(0)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="cashFlowInMillions" 
                radius={[2, 2, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.freeCashFlow >= 0 ? "#f97316" : "#ef4444"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latest {isAnnual ? 'Year' : 'Quarter'}</p>
              <p className={`font-semibold ${latestCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {latestCashFlow >= 0 ? '$' : '-$'}{Math.abs(latestCashFlow / 1000000).toFixed(0)}M
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{isAnnual ? 'YoY' : 'QoQ'} Growth</p>
              <p className={`font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Positive {isAnnual ? 'Years' : 'Quarters'}</p>
              <p className="font-semibold">
                {positivePeriods}/{chartData.length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashFlowChart;

