import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from './api';
import { useApp } from '../context/AppContext';

/** GET helper that refetches when the active learner changes. */
export function useFetch(url, deps = []) {
  const { version } = useApp();
  const [state, set] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    set((s) => ({ ...s, loading: true, error: null }));
    return api.get(url)
      .then((r) => set({ data: r.data, error: null, loading: false }))
      .catch((e) => set({ data: null, error: errorText(e), loading: false }));
  }, [url]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load, version, ...deps]);
  return { ...state, reload: load, setData: (data) => set((s) => ({ ...s, data })) };
}
