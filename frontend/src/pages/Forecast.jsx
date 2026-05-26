import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { uploadAPI, forecastAPI, analyticsAPI } from '../services/api'
import ForecastChart from '../components/Charts/ForecastChart'
import { PageLoader, Spinner, EmptyState } from '../components/Common/Loading'
import { formatNumber, getModelColor } from '../utils/formatters'
import { HiLightningBolt, HiRefresh, HiChartBar, HiLightBulb, HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const MODELS = [
  { id: 'linear', name: 'Linear Regression', desc: 'Fast, interpretable baseline', color: '#3b82f6' },
  { id: 'xgboost', name: 'XGBoost', desc: 'Gradient boosting — high accuracy', color: '#f59e0b' },
  { id: 'arima', name: 'ARIMA', desc: 'Classical time series model', color: '#8b5cf6' },
  { id: 'prophet', name: 'Prophet (Meta)', desc: 'Handles seasonality & holidays', color: '#ec4899' },
  { id: 'lstm', name: 'LSTM Neural Net', desc: 'Deep learning — complex patterns', color: '#10b981' },
]

function MetricBadge({ label, value }) {
  return (
    <div className="text-center p-3 rounded-lg bg-surface">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function JobStatusBadge({ status }) {
  const cfg = {
    pending: { icon: HiClock, cls: 'badge-warning', label: 'Pending' },
    running: { icon: HiRefresh, cls: 'badge-info', label: 'Running' },
    completed: { icon: HiCheckCircle, cls: 'badge-success', label: 'Completed' },
    failed: { icon: HiXCircle, cls: 'badge-error', label: 'Failed' },
  }[status] || { icon: HiClock, cls: 'badge-info', label: status }
  const Icon = cfg.icon
  return (
    <span className={clsx('badge flex items-center gap-1', cfg.cls)}>
      <Icon className={status === 'running' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

export default function Forecast() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ dataset_id: '', model_type: 'prophet', target_column: '', date_column: '', forecast_horizon: 30, horizon_unit: 'days' })
  const [selectedJob, setSelectedJob] = useState(null)
  const [pollingJobId, setPollingJobId] = useState(null)

  const { data: datasets } = useQuery('datasets', () => uploadAPI.listDatasets().then(r => r.data))
  const { data: jobs, refetch: refetchJobs } = useQuery('forecast-jobs', () => forecastAPI.listJobs().then(r => r.data), { refetchInterval: pollingJobId ? 3000 : false })
  const { data: columns } = useQuery(['columns', form.dataset_id], () => analyticsAPI.getColumns(form.dataset_id).then(r => r.data), { enabled: !!form.dataset_id })

  const { data: jobResult, isLoading: resultLoading } = useQuery(
    ['forecast-result', selectedJob],
    () => forecastAPI.getResult(selectedJob).then(r => r.data),
    { enabled: !!selectedJob, refetchInterval: (data) => data?.job?.status === 'running' ? 3000 : false }
  )

  useEffect(() => {
    if (datasets?.length && !form.dataset_id) setForm(f => ({ ...f, dataset_id: datasets[0].id }))
  }, [datasets])

  useEffect(() => {
    if (columns) {
      setForm(f => ({
        ...f,
        date_column: columns.date_columns?.[0] || '',
        target_column: columns.numeric_columns?.[0] || '',
      }))
    }
  }, [columns])

  useEffect(() => {
    const running = jobs?.find(j => j.status === 'running' || j.status === 'pending')
    setPollingJobId(running?.id || null)
  }, [jobs])

  const createMutation = useMutation(forecastAPI.createForecast, {
    onSuccess: (res) => {
      toast.success('Forecast job started!')
      setSelectedJob(res.data.id)
      qc.invalidateQueries('forecast-jobs')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to start forecast'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.dataset_id || !form.target_column || !form.date_column) {
      toast.error('Please select dataset and columns')
      return
    }
    createMutation.mutate({ ...form, dataset_id: Number(form.dataset_id) })
  }

  const allPredictions = jobResult?.predictions || []
  const futurePreds = allPredictions.filter(p => p.is_future)
  const splitDate = futurePreds[0]?.date

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Sales Forecasting</h1>
        <p className="text-slate-400 text-sm mt-0.5">Train ML models and generate future sales predictions</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="card">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <HiLightningBolt className="text-yellow-400" /> New Forecast
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Dataset</label>
                <select className="select" value={form.dataset_id} onChange={e => setForm({ ...form, dataset_id: e.target.value })}>
                  <option value="">Select dataset...</option>
                  {datasets?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Model</label>
                <div className="space-y-2">
                  {MODELS.map(m => (
                    <label key={m.id} className={clsx('flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all', form.model_type === m.id ? 'border-brand-500/50 bg-brand-500/10' : 'border-surface-border hover:border-slate-600')}>
                      <input type="radio" name="model" value={m.id} checked={form.model_type === m.id} onChange={() => setForm({ ...form, model_type: m.id })} className="hidden" />
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <div>
                        <p className="text-sm font-medium text-slate-200">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Date Column</label>
                <select className="select" value={form.date_column} onChange={e => setForm({ ...form, date_column: e.target.value })}>
                  <option value="">Select date column...</option>
                  {columns?.date_columns?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Target Column</label>
                <select className="select" value={form.target_column} onChange={e => setForm({ ...form, target_column: e.target.value })}>
                  <option value="">Select target column...</option>
                  {columns?.numeric_columns?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Horizon</label>
                  <input className="input text-center" type="number" min={1} max={365} value={form.forecast_horizon}
                    onChange={e => setForm({ ...form, forecast_horizon: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Unit</label>
                  <select className="select" value={form.horizon_unit} onChange={e => setForm({ ...form, horizon_unit: e.target.value })}>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full justify-center" disabled={createMutation.isLoading}>
                {createMutation.isLoading ? <><Spinner size="sm" /> Starting...</> : <><HiLightningBolt /> Run Forecast</>}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">Recent Jobs</h3>
              <button onClick={() => refetchJobs()} className="text-slate-500 hover:text-slate-300 text-xs">
                <HiRefresh />
              </button>
            </div>
            <div className="space-y-2">
              {jobs?.slice(0, 6).map(job => (
                <button key={job.id} onClick={() => setSelectedJob(job.id)}
                  className={clsx('w-full text-left p-3 rounded-lg border transition-all text-xs', selectedJob === job.id ? 'border-brand-500/50 bg-brand-500/10' : 'border-surface-border hover:border-slate-600')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-200 capitalize">{job.model_type}</span>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="text-slate-500">{job.target_column} · {job.forecast_horizon} {job.horizon_unit}</p>
                  {job.metrics && <p className="text-green-400 mt-0.5">R²: {job.metrics.r2?.toFixed(3)}</p>}
                </button>
              ))}
              {!jobs?.length && <p className="text-slate-500 text-xs text-center py-4">No jobs yet</p>}
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-4">
          {resultLoading && <PageLoader message="Loading forecast results..." />}
          {!selectedJob && !resultLoading && (
            <EmptyState icon="🔮" title="Select or run a forecast" description="Configure your model on the left and click 'Run Forecast'" />
          )}

          {jobResult && (
            <>
              {jobResult.job.status === 'running' || jobResult.job.status === 'pending' ? (
                <div className="card flex items-center justify-center py-16">
                  <div className="text-center">
                    <Spinner size="lg" />
                    <p className="text-slate-400 mt-4">Training {jobResult.job.model_type} model...</p>
                    <p className="text-slate-500 text-sm mt-1">This may take a few minutes</p>
                  </div>
                </div>
              ) : jobResult.job.status === 'failed' ? (
                <div className="card border-red-500/30 text-center py-8">
                  <HiXCircle className="text-5xl text-red-400 mx-auto mb-3" />
                  <p className="text-red-400 font-semibold">Forecast Failed</p>
                  <p className="text-slate-500 text-sm mt-1">{jobResult.job.error_message}</p>
                </div>
              ) : (
                <>
                  {jobResult.metrics && (
                    <div className="grid grid-cols-4 gap-4">
                      <MetricBadge label="MAE" value={formatNumber(jobResult.metrics.mae)} />
                      <MetricBadge label="RMSE" value={formatNumber(jobResult.metrics.rmse)} />
                      <MetricBadge label="R² Score" value={jobResult.metrics.r2?.toFixed(3)} />
                      <MetricBadge label="MAPE" value={`${jobResult.metrics.mape?.toFixed(1)}%`} />
                    </div>
                  )}

                  <ForecastChart data={allPredictions} splitDate={splitDate} modelName={jobResult.job.model_type} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {jobResult.feature_importance && Object.keys(jobResult.feature_importance).length > 0 && (
                      <div className="card">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <HiChartBar className="text-brand-400" /> Feature Importance
                        </h3>
                        <div className="space-y-2">
                          {Object.entries(jobResult.feature_importance).slice(0, 8).map(([feat, imp]) => {
                            const max = Math.max(...Object.values(jobResult.feature_importance))
                            const pct = ((imp / max) * 100).toFixed(0)
                            return (
                              <div key={feat}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-400">{feat}</span>
                                  <span className="text-slate-500">{typeof imp === 'number' ? imp.toFixed(4) : imp}</span>
                                </div>
                                <div className="h-1.5 bg-surface rounded-full">
                                  <div className="h-1.5 bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {jobResult.insights?.length > 0 && (
                      <div className="card">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <HiLightBulb className="text-yellow-400" /> AI Insights
                        </h3>
                        <ul className="space-y-2">
                          {jobResult.insights.map((ins, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-300">
                              <span className="text-yellow-400 mt-0.5 flex-shrink-0">•</span>
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {futurePreds.length > 0 && (
                    <div className="card">
                      <h3 className="font-semibold text-white mb-3">Future Forecast ({futurePreds.length} days)</h3>
                      <div className="overflow-auto max-h-64">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-500 text-xs border-b border-surface-border">
                              <th className="text-left py-2 pr-4">Date</th>
                              <th className="text-right py-2 pr-4">Predicted</th>
                              <th className="text-right py-2 pr-4">Lower</th>
                              <th className="text-right py-2">Upper</th>
                            </tr>
                          </thead>
                          <tbody>
                            {futurePreds.map((p, i) => (
                              <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover">
                                <td className="py-2 pr-4 text-slate-400">{p.date}</td>
                                <td className="py-2 pr-4 text-right text-white font-medium">{formatNumber(p.predicted)}</td>
                                <td className="py-2 pr-4 text-right text-slate-500">{formatNumber(p.lower_bound)}</td>
                                <td className="py-2 text-right text-slate-500">{formatNumber(p.upper_bound)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
