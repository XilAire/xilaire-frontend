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
import { supabase } from '../lib/supabaseClient';

type KpiEntry = {
  bot: string;
  metric: string;
  value: number;
  timestamp: string;
};

type GroupedData = {
  [key: string]: {
    label: string;
    data: { name: string; value: number }[];
  };
};

export default function KpiGrid() {
  const [grouped, setGrouped] = useState<GroupedData>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('kpi_metrics')
        .select('*')
        .order('timestamp', { ascending: true });

      if (!data || error) {
        console.error('Supabase error:', error);
        return;
      }

      const groupedData: GroupedData = {};

      data.forEach((entry: KpiEntry) => {
        const key = `${entry.bot}_${entry.metric}`;
        if (!groupedData[key]) {
          groupedData[key] = {
            label: `${entry.bot} ${entry.metric}`,
            data: [],
          };
        }

        groupedData[key].data.push({
          name: new Date(entry.timestamp).toLocaleDateString(),
          value: entry.value,
        });
      });

      setGrouped(groupedData);
    };

    fetchData();
  }, []);

  return (
    <div className="grid gap-6">
      {Object.entries(grouped).map(([key, group]) => (
        <div key={key} className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-2">{group.label}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={group.data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
