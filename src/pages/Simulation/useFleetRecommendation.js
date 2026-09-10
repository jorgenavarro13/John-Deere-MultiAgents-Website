import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestFleetRecommendation } from './api.js';
import {
  buildRecommendationPayload,
  newRequestId,
  recommendationSignature,
  shapeRecommendation,
} from './fleetRecommendation.js';

/**
 * Drives one recommendation request at a time for the current terrain/budget.
 *
 * Two rules keep the screen honest:
 *  - every request carries a fresh `requestId`, and a response whose id is not
 *    the one in flight is dropped, so a cancelled or superseded call can never
 *    paint over the current view;
 *  - a result remembers the terrain and budget it was computed for. When those
 *    change it is marked stale rather than silently describing inputs the user
 *    has since edited.
 *
 * `phase` is 'idle' | 'loading' | 'result' | 'insufficient' | 'error'.
 */
export default function useFleetRecommendation({ terrain, budget }) {
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [requestId, setRequestId] = useState(null);

  const pendingId = useRef(null);
  const controller = useRef(null);
  const mounted = useRef(true);

  const signature = recommendationSignature(terrain, budget);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Leaving the screen stops the wait; the server may still finish its own
      // calculation, which is fine because nothing is listening for it.
      controller.current?.abort();
      pendingId.current = null;
    };
  }, []);

  // A result only describes the inputs it was asked for.
  const stale = Boolean(result) && result.signature !== signature;

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    pendingId.current = null;
    // The budget the user typed is owned by the parent and is left untouched.
    setPhase(result ? 'result' : 'idle');
  }, [result]);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    pendingId.current = null;
    setResult(null);
    setRequestId(null);
    setPhase('idle');
  }, []);

  const run = useCallback(async () => {
    controller.current?.abort();
    const id = newRequestId();
    const ac = new AbortController();
    controller.current = ac;
    pendingId.current = id;
    setRequestId(id);
    setPhase('loading');

    const currentSignature = recommendationSignature(terrain, budget);
    try {
      const response = await requestFleetRecommendation(
        buildRecommendationPayload(terrain, budget, id),
        { signal: ac.signal }
      );
      // Late answer to a request that is no longer the live one.
      if (!mounted.current || pendingId.current !== id) return;
      if (response?.requestId && response.requestId !== id) return;
      const shaped = shapeRecommendation(response);
      if (!shaped) {
        setPhase('error');
        return;
      }
      setResult({ ...shaped, signature: currentSignature, requestId: id });
      setPhase('result');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      if (!mounted.current || pendingId.current !== id) return;
      setPhase(e?.kind === 'insufficient_budget' ? 'insufficient' : 'error');
    } finally {
      if (pendingId.current === id) {
        pendingId.current = null;
        controller.current = null;
      }
    }
  }, [terrain, budget]);

  return useMemo(
    () => ({ phase, result, stale, requestId, run, cancel, reset }),
    [phase, result, stale, requestId, run, cancel, reset]
  );
}
