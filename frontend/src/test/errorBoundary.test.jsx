import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

afterEach(cleanup);

function Boom() {
  throw new Error('render exploded');
}

// Reproduces the original blank-screen bug: an effect that returns a non-function (as
// `useEffect(() => window.scrollTo(0, 0))` does in current Chromium, where scrollTo returns a Promise).
function BadCleanup() {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => Promise.resolve(), []);
  return <p>bad cleanup</p>;
}

describe('ErrorBoundary', () => {
  it('shows a recoverable message instead of a blank screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary resetKey="/a"><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong on this page')).toBeInTheDocument();
    expect(screen.getByText('render exploded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('recovers when the route changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ErrorBoundary resetKey="/a"><Boom /></ErrorBoundary>);
    rerender(<ErrorBoundary resetKey="/b"><p>next page</p></ErrorBoundary>);
    expect(screen.getByText('next page')).toBeInTheDocument();
  });

  it('catches a crash from an effect returning a non-function when the component unmounts', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ErrorBoundary resetKey="/same"><BadCleanup /></ErrorBoundary>);
    rerender(<ErrorBoundary resetKey="/same"><p>other</p></ErrorBoundary>);
    // Without the boundary React would unmount the entire tree; with it, the app stays on screen.
    expect(document.body.textContent).not.toBe('');
  });
});
