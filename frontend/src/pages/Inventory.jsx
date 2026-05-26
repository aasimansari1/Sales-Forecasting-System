import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { uploadAPI, analyticsAPI } from '../services/api'
import { PageLoader, EmptyState } from '../components/Common/Loading'
import { formatNumber } from '../utils/formatters'
import { HiCube, HiExclamation, HiCheckCircle } from 'react-icons/hi'
import clsx from 'clsx'

export default function Inventory() {
  const [datasetId, setDatasetId] = useState(null)
  const { data: datasets } = useQuery('datasets', () => uploadAPI.listDatasets().then(r => r.data))
  const { data: inventory, isLoading } = useQuery(['inventory', datasetId], () => analyticsAPI.getInventory(datasetId).then(r => r.data), { enabled: !!datasetId })

  useEffect(() => { if (datasets?.length && !datasetId) setDatasetId(datasets[0].id) }, [datasets])

  const recs = inventory?.recommendations || []
  const reorderNow = recs.filter(r => r.alert === 'REORDER NOW')
  const lowDemand = recs.filter(r => r.alert === 'LOW DEMAND')

  if (!datasets?.length) return <EmptyState icon="📦" title="No datasets" description="Upload a dataset to see inventory recommendations" />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Smart reorder alerts and demand-based recommendations</p>
        </div>
        <select className="select w-52" value={datasetId || ''} onChange={e => setDatasetId(Number(e.target.value))}>
          {datasets?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {isLoading ? <PageLoader message="Computing inventory recommendations..." /> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Products', value: recs.length, icon: HiCube, color: 'blue' },
              { label: 'Reorder Alerts', value: reorderNow.length, icon: HiExclamation, color: 'yellow' },
              { label: 'Low Demand', value: lowDemand.length, icon: HiCheckCircle, color: 'green' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card text-center">
                <Icon className={clsx('text-3xl mx-auto mb-2', { blue: 'text-blue-400', yellow: 'text-yellow-400', green: 'text-green-400' }[color])} />
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {reorderNow.length > 0 && (
            <div className="card border-yellow-500/30">
              <div className="flex items-center gap-2 mb-4">
                <HiExclamation className="text-yellow-400 text-xl" />
                <h3 className="font-semibold text-white">Reorder Alerts ({reorderNow.length})</h3>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-surface-border">
                      <th className="text-left py-2 pr-4">Product</th>
                      <th className="text-right py-2 pr-4">Daily Avg</th>
                      <th className="text-right py-2 pr-4">Safety Stock</th>
                      <th className="text-right py-2 pr-4">Reorder Point</th>
                      <th className="text-right py-2">Recommended Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reorderNow.map((r, i) => (
                      <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover">
                        <td className="py-2.5 pr-4 text-slate-200 font-medium">{r.product}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-400">{formatNumber(r.daily_avg_demand)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-400">{formatNumber(r.safety_stock)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-400">{formatNumber(r.reorder_point)}</td>
                        <td className="py-2.5 text-right">
                          <span className="badge badge-warning">{formatNumber(r.recommended_order_qty)} units</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {recs.length === 0 && (
            <EmptyState icon="📦" title="No inventory data" description="Ensure your dataset has product and quantity columns" />
          )}

          {recs.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Full Inventory Report</h3>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs border-b border-surface-border">
                      <th className="text-left py-2 pr-4">Product</th>
                      <th className="text-right py-2 pr-4">Daily Avg</th>
                      <th className="text-right py-2 pr-4">Safety Stock</th>
                      <th className="text-right py-2 pr-4">Reorder Point</th>
                      <th className="text-right py-2 pr-4">Order Qty</th>
                      <th className="text-right py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recs.map((r, i) => (
                      <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover">
                        <td className="py-2.5 pr-4 text-slate-200">{r.product}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-400">{formatNumber(r.daily_avg_demand)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-400">{formatNumber(r.safety_stock)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-400">{formatNumber(r.reorder_point)}</td>
                        <td className="py-2.5 pr-4 text-right text-slate-400">{formatNumber(r.recommended_order_qty)}</td>
                        <td className="py-2.5 text-right">
                          <span className={r.alert === 'REORDER NOW' ? 'badge badge-warning' : 'badge badge-success'}>
                            {r.alert === 'REORDER NOW' ? 'Reorder' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
