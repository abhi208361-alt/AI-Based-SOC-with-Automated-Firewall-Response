import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("UI crash caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 grid place-items-center p-6">
          <div className="max-w-xl rounded-xl border border-red-700/50 bg-red-950/30 p-5">
            <h1 className="text-xl font-bold text-red-300 mb-2">Something went wrong</h1>
            <p className="text-slate-300 text-sm mb-3">
              A component crashed. Open browser console for details.
            </p>
            <pre className="text-xs text-red-200 whitespace-pre-wrap">
              {String(this.state.error || "Unknown error")}
            </pre>
            <button
              className="mt-4 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}