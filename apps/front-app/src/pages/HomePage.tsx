import { useState } from "react";
import { ApiHealthIndicator } from "@/components/feedback/ApiHealthIndicator";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApiHealth } from "@/hooks/use-api-health";

const logos = [
  { href: "https://vite.dev", src: "/vite.svg", alt: "Vite logo", eager: true },
  {
    href: "https://react.dev",
    src: "/react.svg",
    alt: "React logo",
    eager: false,
  },
  {
    href: "https://workers.cloudflare.com/",
    src: "/Cloudflare_Logo.svg",
    alt: "Cloudflare logo",
    eager: false,
  },
];

export function HomePage() {
  const [count, setCount] = useState(0);
  const { status: apiHealthStatus } = useApiHealth();

  return (
    <>
      <div className="flex items-center justify-center gap-8">
        {logos.map((logo) => (
          <a key={logo.href} href={logo.href} target="_blank" rel="noopener">
            <img
              src={logo.src}
              alt={logo.alt}
              fetchPriority={logo.eager ? "high" : "auto"}
              className="h-24 opacity-80 transition-opacity duration-300 hover:opacity-100 motion-reduce:transition-none"
            />
          </a>
        ))}
      </div>

      <h1 className="mt-8">Vite + React + Cloudflare</h1>

      <Card className="mt-8">
        <Button
          onClick={() => setCount((current) => current + 1)}
          aria-label="increment"
        >
          count is {count}
        </Button>
        <p className="mt-4 text-muted-foreground">
          Edit <code>src/pages/HomePage.tsx</code> and save to test HMR
        </p>
      </Card>

      <Card variant="subtle" className="mt-6">
        <ApiHealthIndicator status={apiHealthStatus} />
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}
