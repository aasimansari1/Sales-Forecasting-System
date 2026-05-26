import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import { formatCurrency, CHART_COLORS } from '../../utils/formatters'

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-3 shadow-xl text-sm">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-semibold text-blue-400">{formatCurrency(payload[0]?.value)}</p>
    </div>
  )
}

export function TopProductsChart({ data }) {
  const truncate = (s, n = 16) => s?.length > n ? s.slice(0, n) + '…' : s

  return (
    <div className="card">
      <h3 className="text-slate-200 font-semibold mb-4">Top Products by Revenue</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => formatCurrency(v, true)} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false}
            tickLine={false} width={110} tickFormatter={(v) => truncate(v)} />
          <Tooltip content={<BarTooltip />} />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {data?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryPieChart({ data }) {
  return (
    <div className="card">
      <h3 className="text-slate-200 font-semibold mb-4">Revenue by Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="revenue" nameKey="category" cx="50%" cy="50%"
            outerRadius={100} innerRadius={50} paddingAngle={3}>
            {data?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RegionalBarChart({ data }) {
  return (
    <div className="card">
      <h3 className="text-slate-200 font-semibold mb-4">Regional Sales Breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="region" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v) => formatCurrency(v, true)} />
          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
          <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
            {data?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
