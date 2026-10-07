import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { buttonClasses } from "#/components/ui/button-classes";

export function NotFoundFallback(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 text-center text-foreground">
      <title>Page not found · Monorepo template</title>
      <h1 className="text-title">Page not found.</h1>
      <Link to="/" className={buttonClasses({ variant: "secondary" })}>
        Back to home
      </Link>
    </div>
  );
}
