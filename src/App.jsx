import React from 'react'
import { MotionConfig } from 'framer-motion'
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
        <div className="flex h-screen w-screen items-center justify-center bg-sunken p-6">
          <div className="max-w-md rounded-2xl border border-line bg-card p-8 text-center shadow-sm">
            <h1 className="text-lg font-bold text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink-muted">
              The page hit an unexpected error. Reloading usually fixes it — if it keeps
              happening, let your administrator know what you clicked.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
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
  // Scrolling (incl. two-finger touchpad swipes) over a focused number input
  // silently increments its value — dangerous for salary/amount fields. Blur
  // the field when a wheel event hits it, so scrolling never edits data.
  React.useEffect(() => {
    const guard = (e) => {
      const el = document.activeElement;
      if (el?.tagName === "INPUT" && el.type === "number" && el === e.target) el.blur();
    };
    document.addEventListener("wheel", guard, { passive: true });
    return () => document.removeEventListener("wheel", guard);
  }, []);

  return (
    <ErrorBoundary>
      {/* Framer animations follow the OS reduced-motion preference. */}
      <MotionConfig reducedMotion="user">
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}

export default App
