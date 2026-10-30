import { useEffect, useState } from 'react';
import { api } from './api';

export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Enums + allowed status transitions come from the backend and are fetched once.
let metaPromise;
export function useMeta() {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    metaPromise ??= api('/meta');
    metaPromise.then(setMeta).catch(() => { metaPromise = null; });
  }, []);
  return meta;
}

// Server-side filtered/paginated tickets. Re-fetches only when params change;
// an in-flight request is cancelled when newer params arrive.
export function useTickets(params) {
  const [state, setState] = useState({ data: [], pagination: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api('/tickets', { params, signal: ctrl.signal })
      .then((res) => setState({ data: res.data, pagination: res.pagination, loading: false, error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });
    return () => ctrl.abort();
  }, [key, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
