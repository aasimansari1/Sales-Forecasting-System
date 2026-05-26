export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={`${sizes[size]} border-4 border-brand-500 border-t-transparent rounded-full animate-spin`} />
  )
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size="lg" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
      <div className="h-8 bg-slate-700 rounded w-3/4 mb-1" />
      <div className="h-3 bg-slate-700 rounded w-1/3" />
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {icon && <div className="text-5xl text-slate-600">{icon}</div>}
      <div>
        <h3 className="text-slate-300 font-semibold text-lg">{title}</h3>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  )
}
