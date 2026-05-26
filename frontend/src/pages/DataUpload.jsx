import { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { uploadAPI } from '../services/api'
import FileUpload from '../components/Upload/FileUpload'
import { PageLoader, EmptyState } from '../components/Common/Loading'
import { formatDate } from '../utils/formatters'
import { HiDatabase, HiTrash, HiEye, HiCalendar, HiTable } from 'react-icons/hi'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

function DatasetCard({ dataset, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${dataset.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await uploadAPI.deleteDataset(dataset.id)
      toast.success('Dataset deleted')
      onDelete()
    } catch {
      toast.error('Failed to delete dataset')
    } finally {
      setDeleting(false)
    }
  }

  const statusColor = {
    ready: 'badge-success', uploaded: 'badge-info', processing: 'badge-warning', error: 'badge-error'
  }

  return (
    <div className="card hover:border-brand-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <HiDatabase className="text-brand-400 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{dataset.name}</h3>
            <p className="text-slate-500 text-xs">{dataset.filename}</p>
          </div>
        </div>
        <span className={statusColor[dataset.status] || 'badge-info'}>{dataset.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2 rounded-lg bg-surface text-center">
          <p className="text-lg font-bold text-white">{dataset.row_count?.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Rows</p>
        </div>
        <div className="p-2 rounded-lg bg-surface text-center">
          <p className="text-lg font-bold text-white">{dataset.column_count}</p>
          <p className="text-xs text-slate-500">Columns</p>
        </div>
        <div className="p-2 rounded-lg bg-surface text-center">
          <p className="text-xs font-bold text-white">{dataset.date_range_start ? formatDate(dataset.date_range_start) : '—'}</p>
          <p className="text-xs text-slate-500">Start Date</p>
        </div>
      </div>

      {dataset.columns_info?.columns && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-1.5">Detected Columns</p>
          <div className="flex flex-wrap gap-1">
            {dataset.columns_info.columns.slice(0, 6).map((c) => (
              <span key={c} className="text-xs px-2 py-0.5 rounded bg-surface text-slate-400">{c}</span>
            ))}
            {dataset.columns_info.columns.length > 6 && (
              <span className="text-xs px-2 py-0.5 rounded bg-surface text-slate-500">
                +{dataset.columns_info.columns.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link to={`/dashboard?dataset=${dataset.id}`} className="btn-secondary flex-1 justify-center text-xs">
          <HiEye /> View Analytics
        </Link>
        <Link to={`/forecast?dataset=${dataset.id}`} className="btn-primary flex-1 justify-center text-xs">
          Forecast
        </Link>
        <button onClick={handleDelete} disabled={deleting} className="btn-danger text-xs px-3">
          <HiTrash />
        </button>
      </div>
    </div>
  )
}

export default function DataUpload() {
  const qc = useQueryClient()
  const { data: datasets, isLoading } = useQuery('datasets', () => uploadAPI.listDatasets().then(r => r.data))

  const handleSuccess = () => qc.invalidateQueries('datasets')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Data Upload</h1>
        <p className="text-slate-400 text-sm mt-0.5">Upload and manage your sales datasets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Upload New Dataset</h2>
            <FileUpload onSuccess={handleSuccess} />
            <div className="mt-4 p-3 rounded-lg bg-surface border border-surface-border text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">Expected CSV columns:</p>
              <p>• <code className="text-brand-400">date</code> — transaction date</p>
              <p>• <code className="text-brand-400">revenue / sales</code> — revenue amount</p>
              <p>• <code className="text-brand-400">product</code> — product name/ID</p>
              <p>• <code className="text-brand-400">category</code> — product category</p>
              <p>• <code className="text-brand-400">region / store</code> — location</p>
              <p>• <code className="text-brand-400">quantity</code> — units sold</p>
              <p>• <code className="text-brand-400">profit / cost</code> — optional</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Your Datasets ({datasets?.length || 0})</h2>
          </div>
          {isLoading ? <PageLoader message="Loading datasets..." /> : datasets?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {datasets.map(d => <DatasetCard key={d.id} dataset={d} onDelete={handleSuccess} />)}
            </div>
          ) : (
            <EmptyState icon={<HiDatabase className="text-5xl text-slate-600" />}
              title="No datasets yet" description="Upload your first CSV to get started" />
          )}
        </div>
      </div>
    </div>
  )
}
