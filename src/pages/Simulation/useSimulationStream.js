import { useEffect, useState } from 'react';
import { openStateStream } from './api.js';

// One shared subscription to /api/state/stream for the whole Viewer subtree:
// the transport panel reads `status`/`state.status` off it, Graphics plots the
// KPI off it. Keeping it in one place avoids opening the SSE connection twice.
//
// Returns:
//   state   the last /api/state payload (or null before the first message)
//   status  'connecting' | 'live' | 'offline'
export default function useSimulationStream() {
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let cancelled = false;
    const es = openStateStream({
      onState: (s) => {
        if (cancelled) return;
        setStatus('live');
        setState(s);
      },
      onError: () => {
        // EventSource keeps retrying on its own; a later message flips us back.
        if (!cancelled) setStatus('offline');
      },
    });
    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  return { state, status };
}
