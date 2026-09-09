import { useEffect, useRef, useState } from 'react';

// Poll `fetcher` every `intervalMs` while mounted; keep the last good value on
// error. `key` restarts the loop when it changes (e.g. a new runId) — pass a
// stable primitive.
export default function usePoll(fetcher, intervalMs, key = '') {
  const [data, setData] = useState(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    let timer;

    const tick = async () => {
      try {
        const d = await fetcherRef.current();
        if (!cancelled) setData(d);
      } catch {
        /* transient; keep the previous value */
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs, key]);

  return data;
}
