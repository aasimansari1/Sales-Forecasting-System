import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { uploadAPI, analyticsAPI } from '../services/api'
import { PageLoader, EmptyState } from '../components/Common/Loading'
import { formatNumber, formatCurrency, CHART_COLORS } from '../utils/formatters'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { HiUsers } from 'react-icons/hi'

export default function Customers() {
  const [datasetId, setDatasetId] = useState(null)
  const { data: datasets } = useQuery('datasets', () => uploadAPI.listDatasets().then(r => r.data))
  const { data: customers, isLoading } = useQuery(['customers', datasetId], () => analyticsAPI.getCustomers(datasetId).then(r => r.data), { enabled: !!datasetId })

  useEffect(() => { if (datasets?.length && !datasetId) setDatasetId(datasets[0].id) }, [datasets])

  if (!datasets?.length) return <EmptyState icon="👥" title="No datasets" description="Upload a dataset to see customer analytics" />

  const pieData = customers?.available ? [
    { name: 'Champions', value: customers.champions, color: '#10b981' },
    { name: 'Loyal', value: customers.loyal_customers, color: '#3b82f6' },
    { name: 'At Risk', value: customers.at_risk, color: '#f59e0b' },
    { name: 'Churned', value: customers.churned, color: '#ef4444' },
  ] : []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">RFM segmentation and customer lifetime value analysis</p>
        </div>
        <select className="select w-52" value={datasetId || ''} onChange={e => setDatasetId(Number(e.target.value))}>
          {datasets?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {isLoading ? <PageLoader message="Analyzing customer data..." /> : !customers?.available ? (
        <div className="card text-center py-12">
          <HiUsers className="text-5xl text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-semibold">No customer data detected</p>
          <p className="text-slate-500 text-sm mt-1">Ensure your dataset has a customer ID column for RFM analysis</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Customers', value: formatNumber(customers.total_customers), color: 'text-white' },
              { label: 'Avg Lifetime Value', value: formatCurrency(customers.avg_clv), color: 'text-green-400' },
              { label: 'Avg Purchases', value: customers.avg_purchase_frequency?.toFixed(1), color: 'text-blue-400' },
              { label: 'Avg Recency', value: `${customers.avg_recency_days?.toFixed(0)}d`, color: 'text-purple-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Customer Segments (RFM)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={100} innerRadius={55} paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => formatNumber(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '13px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="font-semibold text-white mb-4">Segment Details</h3>
              <div className="space-y-4">
                {[
                  { name: 'Champions', value: customers.champions, color: '#10b981', desc: 'Bought recently, buy often, and spend the most' },
                  { name: 'Loyal Customers', value: customers.loyal_customers, color: '#3b82f6', desc: 'Buy on a regular basis, respond to promotions' },
                  { name: 'At Risk', value: customers.at_risk, color: '#f59e0b', desc: 'Used to buy frequently but haven\'t recently' },
                  { name: 'Churned', value: customers.churned, color: '#ef4444', desc: 'Lowest scores on all RFM dimensions' },
                ].map(({ name, value, color, desc }) => (
                  <div key={name} className="flex items-start gap-3 p-3 rounded-lg bg-surface">
                    <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-slate-200 text-sm">{name}</p>
                        <span className="text-xl font-bold" style={{ color }}>{formatNumber(value)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                      <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${(value / customers.total_customers * 100).toFixed(0)}%`, background: color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
