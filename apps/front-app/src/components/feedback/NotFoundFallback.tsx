import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function NotFoundFallback(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-foreground">
      <p className="font-medium">Page not found.</p>
      <Link
        to="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
