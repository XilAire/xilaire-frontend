'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  bot: string;
  metric: string;
  startDate: string;
  endDate: string;
};

type ChartDataPoint = {
  name: string;
  value: number;
};

export default function KpiChart({
  bot,
  metric,
  startDate,
  endDate,
}: Props) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      console.log(`Fetching KPI data for bot=${bot}, metric=${metric.toLowerCase()}, startDate=${startDate}, endDate=${endDate}`);

      const { data: supabaseData, error } = await supabase
        .from('kpi_metrics')
        .select('timestamp, value')
        .eq('bot', bot)
        .eq('metric', metric.toLowerCase())
        .gte('timestamp', `${startDate}T00:00:00Z`)
        .lte('timestamp', `${endDate}T23:59:59Z`)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        setChartData([]);
        return;
      }

      if (supabaseData && supabaseData.length > 0) {
        const mapped = supabaseData.map(row => ({
          name: new Date(row.timestamp).toLocaleDateString(),
          value: Number(row.value),
        }));
        console.log('Fetched chart data:', mapped);
        setChartData(mapped);
      } else {
        console.log('No data returned for given filters');
        setChartData([]);
      }
    };

    fetchData();
  }, [bot, metric, startDate, endDate]);

  const numberFormatter = (value: number) => value.toLocaleString();

  return (
    <div className="bg-white rounded-2xl shadow p-6 w-full max-w-4xl border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">
        Bot KPI Trends: {bot} - {metric.charAt(0).toUpperCase() + metric.slice(1)}
      </h3>

      {chartData.length === 0 ? (
        <p className="text-center text-gray-500">No data available for the selected filters.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={numberFormatter} />
            <Tooltip formatter={numberFormatter} />
            <Line type="monotone" dataKey="value" stroke="#1f4157" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
