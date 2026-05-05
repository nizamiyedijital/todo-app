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
import type { GrowthPoint } from '@/lib/dashboard';

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Veri yok — service-role key eklenince son 30 günün signup grafiği burada gösterilecek.
      </div>
    );
  }

  // Tarih label kısalt
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // 'MM-DD'
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-30" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
            labelFormatter={(label) => `Tarih: ${label}`}
            formatter={(v) => [`${v} kayıt`, 'Yeni kullanıcı']}
          />
          <Line
            type="monotone"
            dataKey="signups"
            stroke="#12A3E3"
            strokeWidth={2}
            dot={{ r: 3, fill: '#12A3E3' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
