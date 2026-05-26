import clsx from 'clsx'
import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi'

export default function MetricCard({ title, value, change, icon: Icon, color = 'blue', subtitle }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-red-500/10 text-red-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
  }

  const isPositive = change >= 0

  return (
    <div className="metric-card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        {Icon && (
          <div className={clsx('p-2 rounded-lg', colors[color])}>
            <Icon className="text-xl" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {(change !== undefined || subtitle) && (
        <div className="flex items-center gap-1.5 mt-1">
          {change !== undefined && (
            <>
              {isPositive ? (
                <HiTrendingUp className="text-green-400 text-sm" />
              ) : (
                <HiTrendingDown className="text-red-400 text-sm" />
              )}
              <span className={clsx('text-xs font-medium', isPositive ? 'text-green-400' : 'text-red-400')}>
                {isPositive ? '+' : ''}{change?.toFixed(1)}%
              </span>
            </>
          )}
          {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
