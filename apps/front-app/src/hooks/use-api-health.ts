// src/hooks/use-api-health.ts

import { ApiHealthStatus } from "@enums/api-health-status";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth } from "@/services/workerApi/health";

type UseApiHealthResult = {
  status: ApiHealthStatus;
  isChecking: boolean;
  checkHealth: () => Promise<void>;
};

export function useApiHealth(): UseApiHealthResult {
  const [status, setStatus] = useState<ApiHealthStatus>(ApiHealthStatus.IDLE);
  const [isChecking, setIsChecking] = useState(false);

  const inflightAbortControllerRef = useRef<AbortController | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    return () => {
      inflightAbortControllerRef.current?.abort();
      inflightAbortControllerRef.current = null;
    };
  }, []);

  const checkHealth = useCallback(async () => {
    if (isCheckingRef.current) {
      return;
    }

    inflightAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    inflightAbortControllerRef.current = abortController;
    isCheckingRef.current = true;

    setIsChecking(true);
    setStatus(ApiHealthStatus.CHECKING);

    try {
      await getHealth({
        signal: abortController.signal,
        timeoutMs: 6000,
        dedupe: false,
      });
      setStatus(ApiHealthStatus.HEALTHY);
    } catch {
      setStatus(ApiHealthStatus.UNHEALTHY);
    } finally {
      if (inflightAbortControllerRef.current === abortController) {
        inflightAbortControllerRef.current = null;
        isCheckingRef.current = false;
        setIsChecking(false);
      }
    }
  }, []);

  return { status, isChecking, checkHealth };
}
