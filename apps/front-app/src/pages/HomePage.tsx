import { useState } from "react";
import { ApiHealthIndicator } from "@/components/feedback/ApiHealthIndicator";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApiHealth } from "@/hooks/use-api-health";

const viteLogo = "/vite.svg";
const reactLogo = "/react.svg";
const cloudflareLogo = "/Cloudflare_Logo.svg";

export function HomePage() {
  const [count, setCount] = useState(0);
  const { status: apiHealthStatus } = useApiHealth();

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
          onClick={() => setCount((current) => current + 1)}
          aria-label="increment"
        >
          count is {count}
        </Button>
        <p className="mt-4">
          Edit <code>src/pages/HomePage.tsx</code> and save to test HMR
        </p>
      </Card>

      <Card className="mt-6 text-center">
        <ApiHealthIndicator status={apiHealthStatus} />
      </Card>

      <p className="read-the-docs mt-6">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}
