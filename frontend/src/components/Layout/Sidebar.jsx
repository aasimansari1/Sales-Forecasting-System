import { NavLink } from 'react-router-dom'
import {
  HiChartBar, HiUpload, HiLightningBolt, HiTrendingUp,
  HiCube, HiUsers, HiDocumentReport,
} from 'react-icons/hi'
import { BsCpuFill } from 'react-icons/bs'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: HiChartBar, label: 'Dashboard' },
  { to: '/upload', icon: HiUpload, label: 'Data Upload' },
  { to: '/forecast', icon: HiLightningBolt, label: 'Forecast' },
  { to: '/analytics', icon: HiTrendingUp, label: 'Analytics' },
  { to: '/inventory', icon: HiCube, label: 'Inventory' },
  { to: '/customers', icon: HiUsers, label: 'Customers' },
  { to: '/reports', icon: HiDocumentReport, label: 'Reports' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-surface-card border-r border-surface-border flex flex-col">
      <div className="p-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
            <BsCpuFill className="text-white text-lg" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">SalesCast AI</h1>
            <p className="text-xs text-slate-500">Forecasting Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200'
              )
            }
          >
            <Icon className="text-lg flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
