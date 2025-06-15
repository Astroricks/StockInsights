import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatTimeframeLabel } from '../utils/fetchAlphaVantage';

const EPSChart = ({ data, timeframe = 'Quarterly' }) => {
  // Select appropriate data based on timeframe
  const isAnnual = timeframe.toLowerCase().includes('annual');
  const sourceData = isAnnual ? (data?.annual || []) : (data?.quarterly || []);
  
  if (!sourceData || sourceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>EPS</span>
            <span className="text-sm text-muted-foreground">{timeframe}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No EPS data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = sourceData.map(item => ({
    date: item.date,
    quarter: formatTimeframeLabel(item.date, isAnnual),
    eps: item.eps || 0,
    estimatedEPS: item.estimatedEPS,
    surprise: item.surprise,
    surprisePercentage: item.surprisePercentage,
    reportedDate: item.reportedDate
  })).filter(item => item.eps !== null && item.eps !== undefined);

  // Calculate metrics
  const latestEPS = chartData[chartData.length - 1]?.eps || 0;
  const previousEPS = chartData[chartData.length - 2]?.eps || 0;
  const growth = previousEPS !== 0 ? ((latestEPS - previousEPS) / Math.abs(previousEPS)) * 100 : 0;
  const positiveEPSPeriods = chartData.filter(d => d.eps >= 0).length;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.eps;
      const isPositive = value >= 0;
      const surprise = data.surprise;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.quarter}</p>
          <p className={`text-sm ${isPositive ? 'text-yellow-600' : 'text-red-600'}`}>
            Reported EPS: {isPositive ? '$' : '-$'}{Math.abs(value).toFixed(2)}
          </p>
          {data.estimatedEPS && (
            <p className="text-sm text-muted-foreground">
              Estimated: ${data.estimatedEPS.toFixed(2)}
            </p>
          )}
          {surprise !== null && surprise !== undefined && (
            <p className={`text-sm ${surprise >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Surprise: {surprise >= 0 ? '+$' : '-$'}{Math.abs(surprise).toFixed(2)}
            </p>
          )}
          {data.reportedDate && (
            <p className="text-xs text-muted-foreground">
              Reported: {new Date(data.reportedDate).toLocaleDateString()}
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
            <span>EPS</span>
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
                dataKey="eps" 
                radius={[2, 2, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.eps >= 0 ? "#eab308" : "#ef4444"} 
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
              <p className={`font-semibold ${latestEPS >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {latestEPS >= 0 ? '$' : '-$'}{Math.abs(latestEPS).toFixed(2)}
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
                {positiveEPSPeriods}/{chartData.length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EPSChart;

