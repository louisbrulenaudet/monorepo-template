// src/routes/HomePage.tsx

import { useState } from "react";
import { ApiHealthIndicator } from "@/components/feedback/ApiHealthIndicator";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApiHealth } from "@/hooks/use-api-health";
import viteLogo from "/vite.svg";

const reactLogo = "/react.svg";
const cloudflareLogo = "/Cloudflare_Logo.svg";

export function HomePage() {
  const [count, setCount] = useState(0);
  const {
    status: apiHealthStatus,
    isChecking: isCheckingApiHealth,
    checkHealth,
  } = useApiHealth();

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noopener">
          <img
            src={viteLogo}
            className="logo"
            alt="Vite logo"
            fetchPriority="high"
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a
          href="https://workers.cloudflare.com/"
          target="_blank"
          rel="noopener"
        >
          <img
            src={cloudflareLogo}
            className="logo cloudflare"
            alt="Cloudflare logo"
          />
        </a>
      </div>

      <h1 className="mt-4">Vite + React + Cloudflare</h1>

      <Card className="mt-8 text-center">
        <Button
          onClick={() => setCount((count) => count + 1)}
          aria-label="increment"
        >
          count is {count}
        </Button>
        <p className="mt-4">
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </Card>

      <Card className="mt-6 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <Button
            onClick={checkHealth}
            aria-label="check api health"
            disabled={isCheckingApiHealth}
            aria-busy={isCheckingApiHealth}
          >
            {isCheckingApiHealth ? "Checking…" : "Check API health"}
          </Button>
          <ApiHealthIndicator status={apiHealthStatus} />
        </div>
      </Card>

      <p className="read-the-docs mt-6">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}
