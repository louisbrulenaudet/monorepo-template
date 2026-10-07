import type { ReactNode } from "react";

export function Badge({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="relative inline-flex items-center gap-1.5 rounded-sm bg-primary/5 px-2.5 py-1.5 font-mono text-caption/none font-medium text-primary">
      <svg
        className="pointer-events-none absolute top-0 left-0 size-[calc(100%-1px)] overflow-visible"
        aria-hidden="true"
      >
        <rect
          x="0.5"
          y="0.5"
          width="100%"
          height="100%"
          rx="3.5"
          fill="none"
          stroke="currentColor"
          strokeDasharray="3 3"
        />
      </svg>
      {children}
    </span>
  );
}
