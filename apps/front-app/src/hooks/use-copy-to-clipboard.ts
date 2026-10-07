import { useEffect, useRef, useState } from "react";

const STATUS_RESET_MS = 2_000;

export type CopyStatus = "idle" | "copied" | "failed";

type UseCopyToClipboardResult = {
  status: CopyStatus;
  copy: (text: string) => Promise<void>;
};

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  const copy = async (text: string) => {
    let next: CopyStatus = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = "failed";
    }

    setStatus(next);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setStatus("idle");
    }, STATUS_RESET_MS);
  };

  return { status, copy };
}
