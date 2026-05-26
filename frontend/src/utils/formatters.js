export const formatCurrency = (val, compact = false) => {
  if (val == null || isNaN(val)) return '$0'
  if (compact && Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
  if (compact && Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

export const formatNumber = (val, compact = false) => {
  if (val == null || isNaN(val)) return '0'
  if (compact && Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)}M`
  if (compact && Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(1)}K`
  return new Intl.NumberFormat('en-US').format(Math.round(val))
}

export const formatPercent = (val) => {
  if (val == null || isNaN(val)) return '0%'
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
}

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const getChangeColor = (val) => {
  if (val > 0) return 'text-green-400'
  if (val < 0) return 'text-red-400'
  return 'text-slate-400'
}

export const getModelColor = (model) => {
  const colors = {
    linear: '#3b82f6',
    xgboost: '#f59e0b',
    arima: '#8b5cf6',
    prophet: '#ec4899',
    lstm: '#10b981',
    ensemble: '#f97316',
  }
  return colors[model] || '#64748b'
}

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4']
