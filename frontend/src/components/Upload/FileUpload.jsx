import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { HiUpload, HiDocument, HiX, HiCheck } from 'react-icons/hi'
import { uploadAPI } from '../../services/api'
import { Spinner } from '../Common/Loading'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function FileUpload({ onSuccess }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setName(accepted[0].name.replace(/\.(csv|xlsx|xls)$/, ''))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
    maxSize: 52428800,
  })

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      toast.error('Please provide a dataset name')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name.trim())
      const { data } = await uploadAPI.uploadCSV(fd)
      toast.success(`Dataset "${data.name}" uploaded — ${data.row_count.toLocaleString()} rows`)
      onSuccess?.(data)
      setFile(null)
      setName('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-brand-500 bg-brand-500/10'
            : file
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-surface-border hover:border-brand-500/50 hover:bg-brand-500/5'
        )}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
              <HiCheck className="text-3xl text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-400">{file.name}</p>
              <p className="text-slate-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1"
            >
              <HiX /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center">
              <HiUpload className="text-3xl text-brand-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">
                {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-slate-500 text-sm mt-1">CSV, XLS, XLSX up to 50MB</p>
            </div>
          </div>
        )}
      </div>

      {file && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">Dataset Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Retail Sales Q4 2024"
            />
          </div>
          <button className="btn-primary w-full justify-center" onClick={handleUpload} disabled={uploading}>
            {uploading ? <><Spinner size="sm" /> Uploading...</> : <><HiUpload /> Upload Dataset</>}
          </button>
        </div>
      )}
    </div>
  )
}
