import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { formatCurrency, formatNumber } from '../../utils/formatters'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-3 shadow-xl text-sm min-w-[160px]">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        p.value != null && (
          <p key={p.dataKey} className="flex justify-between gap-3">
            <span style={{ color: p.color }}>{p.name}:</span>
            <span className="font-semibold text-white">{formatNumber(p.value)}</span>
          </p>
        )
      ))}
    </div>
  )
}

export default function ForecastChart({ data, splitDate, modelName }) {
  const chartData = data?.map((d) => ({
    date: d.date,
    actual: d.actual != null ? Number(d.actual.toFixed(2)) : null,
    predicted: Number(d.predicted.toFixed(2)),
    lower: d.lower_bound != null ? Number(d.lower_bound.toFixed(2)) : null,
    upper: d.upper_bound != null ? Number(d.upper_bound.toFixed(2)) : null,
    confidence: d.lower_bound != null && d.upper_bound != null
      ? [Number(d.lower_bound.toFixed(2)), Number(d.upper_bound.toFixed(2))]
      : null,
  }))

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-200 font-semibold">Forecast vs Actual</h3>
        {modelName && (
          <span className="badge badge-info capitalize">{modelName} model</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => v?.slice(5)} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => formatNumber(v, true)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px', color: '#94a3b8' }} />
          {splitDate && (
            <ReferenceLine x={splitDate} stroke="#f59e0b" strokeDasharray="4 4"
              label={{ value: 'Forecast Start', fill: '#f59e0b', fontSize: 11 }} />
          )}
          <Area type="monotone" dataKey="upper" name="Upper Bound" fill="url(#confidenceGrad)"
            stroke="#3b82f630" strokeWidth={0} legendType="none" />
          <Area type="monotone" dataKey="lower" name="Lower Bound" fill="white"
            stroke="#3b82f630" strokeWidth={0} legendType="none" />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#10b981"
            strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#3b82f6"
            strokeWidth={2} dot={false} strokeDasharray="5 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
