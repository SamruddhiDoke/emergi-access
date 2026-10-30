import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

/**
 * Loads `path` and exposes { data, error, loading, reload }. Passing null skips the request.
 * `reload({ silent: true })` refreshes without flashing the loading state.
 */
export function useApi(path, { deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const controller = useRef(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!path) return;
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      if (!silent) setLoading(true);
      try {
        const result = await api(path, { signal: ctrl.signal });
        setData(result);
        setError(null);
        return result;
      } catch (err) {
        if (err.name !== 'AbortError') setError(err);
      } finally {
        if (controller.current === ctrl) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, ...deps],
  );

  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}

export function useInterval(callback, delay) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Seconds remaining until `expiresAt`, corrected for clock skew using the server time the API
 * reported. Display only — the backend independently enforces expiry.
 */
export function useCountdown(expiresAt, serverTime) {
  const offset = useRef(0);
  useEffect(() => {
    if (serverTime) offset.current = new Date(serverTime).getTime() - Date.now();
  }, [serverTime]);
  const compute = useCallback(
    () => (expiresAt ? Math.max(0, (new Date(expiresAt).getTime() - (Date.now() + offset.current)) / 1000) : 0),
    [expiresAt],
  );
  const [remaining, setRemaining] = useState(compute);
  useEffect(() => {
    setRemaining(compute());
    const id = setInterval(() => setRemaining(compute()), 250);
    return () => clearInterval(id);
  }, [compute, serverTime]);
  return remaining;
}
