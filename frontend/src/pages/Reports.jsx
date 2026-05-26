import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { uploadAPI, analyticsAPI, forecastAPI } from '../services/api'
import { PageLoader, EmptyState } from '../components/Common/Loading'
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters'
import { HiDocumentReport, HiDownload, HiChartBar } from 'react-icons/hi'
import toast from 'react-hot-toast'

export default function Reports() {
  const [datasetId, setDatasetId] = useState(null)
  const { data: datasets } = useQuery('datasets', () => uploadAPI.listDatasets().then(r => r.data))
  const { data: dashboard } = useQuery(['dashboard', datasetId], () => analyticsAPI.getDashboard(datasetId).then(r => r.data), { enabled: !!datasetId })
  const { data: jobs } = useQuery('forecast-jobs', () => forecastAPI.listJobs().then(r => r.data))

  useEffect(() => { if (datasets?.length && !datasetId) setDatasetId(datasets[0].id) }, [datasets])

  const completedJobs = jobs?.filter(j => j.status === 'completed') || []

  const downloadCSV = () => {
    if (!dashboard) return
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', dashboard.total_revenue],
      ['Total Profit', dashboard.total_profit],
      ['Total Orders', dashboard.total_orders],
      ['Average Order Value', dashboard.average_order_value],
      ['Profit Margin %', dashboard.profit_margin],
      ['Revenue Growth %', dashboard.revenue_growth],
      ['', ''],
      ['Top Products', ''],
      ...dashboard.top_products.map(p => [p.name, p.revenue]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sales_report.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
  }

  if (!datasets?.length) return <EmptyState icon="📄" title="No datasets" description="Upload a dataset to generate reports" />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Exports</h1>
          <p className="text-slate-400 text-sm mt-0.5">Generate and download detailed sales reports</p>
        </div>
        <div className="flex gap-3">
          <select className="select w-48" value={datasetId || ''} onChange={e => setDatasetId(Number(e.target.value))}>
            {datasets?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn-primary" onClick={downloadCSV} disabled={!dashboard}>
            <HiDownload /> Export CSV
          </button>
        </div>
      </div>

      {dashboard ? (
        <>
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <HiDocumentReport className="text-brand-400" /> Executive Summary
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Revenue', value: formatCurrency(dashboard.total_revenue) },
                { label: 'Total Profit', value: formatCurrency(dashboard.total_profit) },
                { label: 'Profit Margin', value: `${dashboard.profit_margin?.toFixed(1)}%` },
                { label: 'Revenue Growth MoM', value: `${dashboard.revenue_growth >= 0 ? '+' : ''}${dashboard.revenue_growth?.toFixed(1)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 rounded-lg bg-surface text-center">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-slate-400 text-sm font-medium mb-3">Top Products</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-surface-border">
                      <th className="text-left py-1.5 pr-4">Product</th>
                      <th className="text-right py-1.5">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.top_products?.slice(0, 8).map((p, i) => (
                      <tr key={i} className="border-b border-surface-border/30">
                        <td className="py-1.5 pr-4 text-slate-300">{p.name}</td>
                        <td className="py-1.5 text-right text-green-400 font-medium">{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="text-slate-400 text-sm font-medium mb-3">Monthly Revenue</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-surface-border">
                      <th className="text-left py-1.5 pr-4">Period</th>
                      <th className="text-right py-1.5">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.monthly_trends?.slice(-12).map((m, i) => (
                      <tr key={i} className="border-b border-surface-border/30">
                        <td className="py-1.5 pr-4 text-slate-300">{String(m.month)}</td>
                        <td className="py-1.5 text-right text-blue-400 font-medium">{formatCurrency(m.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {completedJobs.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <HiChartBar className="text-brand-400" /> Forecast Model Performance
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-surface-border">
                    <th className="text-left py-2 pr-4">Model</th>
                    <th className="text-left py-2 pr-4">Target</th>
                    <th className="text-right py-2 pr-4">MAE</th>
                    <th className="text-right py-2 pr-4">RMSE</th>
                    <th className="text-right py-2 pr-4">R²</th>
                    <th className="text-right py-2">MAPE</th>
                  </tr>
                </thead>
                <tbody>
                  {completedJobs.map((job) => (
                    <tr key={job.id} className="border-b border-surface-border/50 hover:bg-surface-hover">
                      <td className="py-2.5 pr-4 capitalize">
                        <span className="badge badge-info">{job.model_type}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">{job.target_column}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-300">{formatNumber(job.metrics?.mae)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-300">{formatNumber(job.metrics?.rmse)}</td>
                      <td className="py-2.5 pr-4 text-right">
                        <span className={job.metrics?.r2 > 0.8 ? 'text-green-400' : job.metrics?.r2 > 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                          {job.metrics?.r2?.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400">{job.metrics?.mape?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : <PageLoader message="Loading report data..." />}
    </div>
  )
}
