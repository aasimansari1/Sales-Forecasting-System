import { useState } from 'react'
import { useQuery } from 'react-query'
import { analyticsAPI, uploadAPI } from '../services/api'
import MetricCard from '../components/Dashboard/MetricCard'
import RevenueChart from '../components/Charts/RevenueChart'
import { TopProductsChart, CategoryPieChart, RegionalBarChart } from '../components/Charts/ProductChart'
import { PageLoader, EmptyState, SkeletonCard } from '../components/Common/Loading'
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters'
import { HiCurrencyDollar, HiTrendingUp, HiShoppingCart, HiChartBar, HiLightBulb } from 'react-icons/hi'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [selectedDataset, setSelectedDataset] = useState(null)

  const { data: datasets } = useQuery('datasets', () => uploadAPI.listDatasets().then(r => r.data))
  const datasetId = selectedDataset || datasets?.[0]?.id

  const { data: metrics, isLoading, error } = useQuery(
    ['dashboard', datasetId],
    () => analyticsAPI.getDashboard(datasetId).then(r => r.data),
    { enabled: !!datasetId }
  )

  if (!datasets?.length) {
    return (
      <EmptyState
        icon="📊"
        title="No datasets yet"
        description="Upload your sales data to see analytics and forecasts"
        action={<Link to="/upload" className="btn-primary">Upload Dataset</Link>}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Overview of your sales performance and trends</p>
        </div>
        <select className="select w-56" value={datasetId || ''} onChange={(e) => setSelectedDataset(Number(e.target.value))}>
          {datasets?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card text-center text-red-400">Failed to load dashboard data</div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Revenue" value={formatCurrency(metrics.total_revenue, true)}
              change={metrics.revenue_growth} icon={HiCurrencyDollar} color="blue" subtitle="vs last month" />
            <MetricCard title="Total Profit" value={formatCurrency(metrics.total_profit, true)}
              change={metrics.profit_margin} icon={HiTrendingUp} color="green" subtitle="profit margin" />
            <MetricCard title="Total Orders" value={formatNumber(metrics.total_orders, true)}
              icon={HiShoppingCart} color="purple" subtitle="transactions" />
            <MetricCard title="Avg Order Value" value={formatCurrency(metrics.average_order_value)}
              icon={HiChartBar} color="yellow" subtitle="per transaction" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <RevenueChart data={metrics.monthly_trends} title="Monthly Revenue Trend" />
            </div>
            <CategoryPieChart data={metrics.category_breakdown?.slice(0, 6)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProductsChart data={metrics.top_products?.slice(0, 8)} />
            <RegionalBarChart data={metrics.regional_breakdown?.slice(0, 8)} />
          </div>

          {metrics.low_performers?.length > 0 && (
            <div className="card">
              <h3 className="text-slate-200 font-semibold mb-4">Low-Performing Products</h3>
              <div className="space-y-2">
                {metrics.low_performers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-hover transition-colors">
                    <span className="text-slate-300 text-sm">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-medium text-sm">{formatCurrency(p.revenue)}</span>
                      <span className="badge badge-warning">Low</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <HiLightBulb className="text-yellow-400 text-xl" />
              <h3 className="text-slate-200 font-semibold">Yearly Revenue Summary</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {metrics.yearly_trends?.map((y) => (
                <div key={y.year} className="p-4 rounded-lg bg-surface text-center">
                  <p className="text-slate-500 text-xs mb-1">{y.year}</p>
                  <p className="text-white font-bold">{formatCurrency(y.revenue, true)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
