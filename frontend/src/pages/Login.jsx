import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/Common/Loading'
import { BsCpuFill } from 'react-icons/bs'
import { HiEye, HiEyeOff } from 'react-icons/hi'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [isRegister, setIsRegister] = useState(false)

  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isRegister) {
        await register(form.name, form.email, form.password)
        toast.success('Account created!')
      } else {
        await login(form.email, form.password)
        toast.success('Welcome back!')
      }
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-600/30">
            <BsCpuFill className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">SalesCast AI</h1>
          <p className="text-slate-400 text-sm mt-1">AI-Powered Sales Forecasting Platform</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">
            {isRegister ? 'Create an account' : 'Sign in to your account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Full Name</label>
                <input className="input" placeholder="John Smith" value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Email Address</label>
              <input className="input" type="email" placeholder="you@company.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? <Spinner size="sm" /> : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-brand-400 hover:text-brand-300">
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
