import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// A lazily loaded chunk that no longer exists (e.g. after a redeploy) surfaces as one of these.
const isChunkLoadError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    error?.message || '',
  );

/**
 * Catches rendering errors so a single failing screen shows a recoverable message instead of
 * unmounting the whole application to a blank page. `resetKey` (the current path) clears the error
 * when the user navigates elsewhere.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const stale = isChunkLoadError(error);

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-5 py-16" role="alert">
        <div className="card w-full max-w-md px-8 py-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-600/10">
            <AlertTriangle className="size-5" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink">
            {stale ? 'A new version is available' : 'Something went wrong on this page'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {stale
              ? 'Emergi-Access was updated while this tab was open. Reload to continue.'
              : 'The page failed to display. Your data is safe — try reloading, or return to the home page.'}
          </p>
          {!stale && error?.message && (
            <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-left font-mono text-xs text-muted ring-1 ring-line">{error.message}</p>
          )}
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              <RefreshCw className="size-4" /> Reload page
            </button>
            <a href="/" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line-strong bg-white px-4 text-sm font-medium text-ink hover:bg-canvas">
              <Home className="size-4" /> Go to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
