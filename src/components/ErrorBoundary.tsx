import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional label to identify which boundary caught the error (shown in dev). */
  scope?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the real error instead of a silent white screen.
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ''}]`, error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.assign('/')
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#F4F4F5' }}>
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">⚠️</div>
        <div>
          <div className="text-base font-bold" style={{ color: '#18181B' }}>Une erreur est survenue</div>
          <div className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            La page n'a pas pu se charger correctement.
          </div>
          {import.meta.env.DEV && (
            <pre className="text-[10px] text-left mt-3 max-w-xs overflow-auto bg-white border border-gray-200 rounded-lg p-2" style={{ color: '#b91c1c' }}>
              {error.message}
            </pre>
          )}
        </div>
        <button
          onClick={this.handleReload}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#E8920A' }}
        >
          Recharger
        </button>
      </div>
    )
  }
}
