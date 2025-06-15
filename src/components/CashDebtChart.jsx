import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTimeframeLabel } from '../utils/fetchAlphaVantage';

const CashDebtChart = ({ data, timeframe = 'Quarterly' }) => {
  // Select appropriate data based on timeframe
  const isAnnual = timeframe.toLowerCase().includes('annual');
  const sourceData = isAnnual ? (data?.annual || []) : (data?.quarterly || []);
  
  if (!sourceData || sourceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cash & Debt</span>
            <span className="text-sm text-muted-foreground">{timeframe}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No cash & debt data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = sourceData.map(item => ({
    date: item.date || item.calendarYear,
    quarter: formatTimeframeLabel(item.date, isAnnual),
    cash: (item.cash || item.cashAndCashEquivalents || 0) / 1000000000, // Convert to billions
    debt: (item.totalDebt || item.totalLiabilities || 0) / 1000000000, // Convert to billions
    rawCash: item.cash || item.cashAndCashEquivalents || 0,
    rawDebt: item.totalDebt || item.totalLiabilities || 0
  })).filter(item => item.rawCash > 0 || item.rawDebt > 0);

  // Calculate metrics
  const latestData = chartData[chartData.length - 1];
  const netCash = latestData ? latestData.rawCash - latestData.rawDebt : 0;
  const cashRatio = latestData && latestData.rawDebt > 0 ? latestData.rawCash / latestData.rawDebt : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.quarter}</p>
          <p className="text-sm text-green-600">
            Cash: ${data.cash.toFixed(2)}B
          </p>
          <p className="text-sm text-red-600">
            Debt: ${data.debt.toFixed(2)}B
          </p>
          <p className="text-sm text-muted-foreground">
            Net: ${(data.cash - data.debt).toFixed(2)}B
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
            <span>Cash & Debt</span>
            {netCash !== 0 && (
              <span className={`text-sm ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net: {netCash >= 0 ? '$' : '-$'}{Math.abs(netCash / 1000000000).toFixed(2)}B
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
                tickFormatter={(value) => `$${value.toFixed(1)}B`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="cash" 
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                name="Cash"
              />
              <Bar 
                dataKey="debt" 
                fill="#ef4444"
                radius={[2, 2, 0, 0]}
                name="Debt"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latest Cash</p>
              <p className="font-semibold text-green-600">
                ${latestData ? latestData.cash.toFixed(2) : '0.00'}B
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Latest Debt</p>
              <p className="font-semibold text-red-600">
                ${latestData ? latestData.debt.toFixed(2) : '0.00'}B
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Cash/Debt Ratio</p>
              <p className="font-semibold">
                {cashRatio > 0 ? cashRatio.toFixed(2) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Cash</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Debt</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashDebtChart;

