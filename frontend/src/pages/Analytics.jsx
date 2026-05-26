import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { uploadAPI, analyticsAPI } from '../services/api'
import { PageLoader, EmptyState } from '../components/Common/Loading'
import { formatNumber, formatCurrency } from '../utils/formatters'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line, Legend
} from 'recharts'
import { CHART_COLORS } from '../utils/formatters'
import { HiExclamation, HiTrendingUp, HiCalendar } from 'react-icons/hi'

const TTip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-surface-card border border-surface-border rounded-lg p-3 shadow-xl text-sm">
    <p className="text-slate-400 mb-1">{label}</p>
    {payload.map(p => <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">{p.name}: {formatNumber(p.value)}</p>)}
  </div>
) : null

export default function Analytics() {
  const [datasetId, setDatasetId] = useState(null)
  const [targetCol, setTargetCol] = useState('')

  const { data: datasets } = useQuery('datasets', () => uploadAPI.listDatasets().then(r => r.data))
  const { data: columns } = useQuery(['columns', datasetId], () => analyticsAPI.getColumns(datasetId).then(r => r.data), { enabled: !!datasetId })
  const { data: seasonal, isLoading: sl } = useQuery(['seasonal', datasetId, targetCol], () => analyticsAPI.getSeasonal(datasetId, targetCol).then(r => r.data), { enabled: !!datasetId && !!targetCol })
  const { data: anomalyData, isLoading: al } = useQuery(['anomalies', datasetId, targetCol], () => analyticsAPI.getAnomalies(datasetId, targetCol).then(r => r.data), { enabled: !!datasetId && !!targetCol })
  const { data: customers, isLoading: cl } = useQuery(['customers', datasetId], () => analyticsAPI.getCustomers(datasetId).then(r => r.data), { enabled: !!datasetId })

  useEffect(() => { if (datasets?.length && !datasetId) setDatasetId(datasets[0].id) }, [datasets])
  useEffect(() => { if (columns?.numeric_columns?.length) setTargetCol(columns.numeric_columns[0]) }, [columns])

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyData = seasonal?.monthly_seasonality
    ? Object.entries(seasonal.monthly_seasonality).map(([k, v]) => ({ month: monthNames[Number(k)-1] || k, value: v }))
    : []

  const dayData = seasonal?.day_of_week_pattern
    ? Object.entries(seasonal.day_of_week_pattern).map(([k, v]) => ({ day: k, value: v }))
    : []

  const rfmData = customers?.available ? [
    { segment: 'Champions', value: customers.champions, fill: '#10b981' },
    { segment: 'Loyal', value: customers.loyal_customers, fill: '#3b82f6' },
    { segment: 'At Risk', value: customers.at_risk, fill: '#f59e0b' },
    { segment: 'Churned', value: customers.churned, fill: '#ef4444' },
  ] : []

  if (!datasets?.length) {
    return <EmptyState icon="📊" title="No datasets" description="Upload a dataset to view analytics" />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Seasonality, anomalies, and customer behavior insights</p>
        </div>
        <div className="flex gap-3">
          <select className="select w-48" value={datasetId || ''} onChange={e => setDatasetId(Number(e.target.value))}>
            {datasets?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="select w-44" value={targetCol} onChange={e => setTargetCol(e.target.value)}>
            <option value="">Target column...</option>
            {columns?.numeric_columns?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <HiCalendar className="text-brand-400 text-xl" />
            <h3 className="font-semibold text-white">Monthly Seasonality</h3>
            {seasonal?.peak_month && <span className="badge badge-info ml-auto">Peak: Month {seasonal.peak_month}</span>}
          </div>
          {sl ? <PageLoader message="Analyzing seasonality..." /> : monthlyData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatNumber(v, true)} />
                <Tooltip content={<TTip />} />
                <Bar dataKey="value" name="Avg Sales" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm text-center py-8">No seasonality data available</p>}
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">Day of Week Pattern</h3>
          {sl ? <PageLoader message="Analyzing patterns..." /> : dayData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={dayData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => formatNumber(v, true)} />
                <Radar name="Sales" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-500 text-sm text-center py-8">No weekly pattern data</p>}
          {seasonal?.peak_day && (
            <p className="text-xs text-slate-400 text-center mt-2">Peak day: <span className="text-brand-400">{seasonal.peak_day}</span></p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <HiExclamation className="text-yellow-400 text-xl" />
          <h3 className="font-semibold text-white">Anomaly Detection</h3>
          {anomalyData && <span className="badge badge-warning ml-auto">{anomalyData.anomalies_detected} anomalies in {anomalyData.total_points} points</span>}
        </div>
        {al ? <PageLoader message="Detecting anomalies..." /> : anomalyData?.anomalies?.length ? (
          <div className="overflow-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-surface-border">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-right py-2 pr-4">Value</th>
                  <th className="text-right py-2 pr-4">Anomaly Score</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {anomalyData.anomalies.slice(0, 20).map((a, i) => (
                  <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover">
                    <td className="py-2 pr-4 text-slate-400">{a.date}</td>
                    <td className="py-2 pr-4 text-right text-yellow-400 font-medium">{formatNumber(a.value)}</td>
                    <td className="py-2 pr-4 text-right text-slate-500">{a.anomaly_score?.toFixed(3)}</td>
                    <td className="py-2 text-slate-400 text-xs">{a.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-slate-500 text-sm text-center py-8">No anomalies detected or select a target column above</p>}
      </div>

      {customers?.available && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <HiTrendingUp className="text-brand-400" /> Customer RFM Segments
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rfmData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="segment" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TTip />} />
                <Bar dataKey="value" name="Customers" radius={[4, 4, 0, 0]}>
                  {rfmData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-4">Customer Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Customers', value: formatNumber(customers.total_customers) },
                { label: 'Avg CLV', value: formatCurrency(customers.avg_clv) },
                { label: 'Champions', value: formatNumber(customers.champions), color: 'text-green-400' },
                { label: 'Loyal', value: formatNumber(customers.loyal_customers), color: 'text-blue-400' },
                { label: 'At Risk', value: formatNumber(customers.at_risk), color: 'text-yellow-400' },
                { label: 'Churned', value: formatNumber(customers.churned), color: 'text-red-400' },
                { label: 'Avg Purchases', value: customers.avg_purchase_frequency?.toFixed(1) },
                { label: 'Avg Recency', value: `${customers.avg_recency_days?.toFixed(0)} days` },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-lg bg-surface">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`font-bold mt-0.5 ${color || 'text-white'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
