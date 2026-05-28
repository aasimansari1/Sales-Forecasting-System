import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-surface-card border border-red-500/30 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-white font-bold text-xl mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mx-auto"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
