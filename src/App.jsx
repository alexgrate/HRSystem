import React from 'react'
import AppRoutes from './routes/AppRoutes'
import { NotificationProvider } from './components/ui/Notifications'
import "./index.css"

// Last line of defense: a render error anywhere below should show a recoverable
// message instead of a blank white page.
class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[App] Unhandled render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500">
              The page hit an unexpected error. Reloading usually fixes it — if it keeps
              happening, let your administrator know what you clicked.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-[#4f1a60] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App
