import { useState } from "react";
import { ApiHealthIndicator } from "#/components/feedback/ApiHealthIndicator";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { CopyPromptButton } from "#/components/ui/CopyPromptButton";
import { useApiHealth } from "#/hooks/use-api-health";

/** Intrinsic sizes match SVG viewBox aspect at CSS `h-24` (96px). */
const logos = [
  {
    href: "https://vite.dev",
    src: "/vite.svg",
    alt: "Vite logo",
    width: 96,
    height: 96,
    eager: true,
  },
  {
    href: "https://react.dev",
    src: "/react.svg",
    alt: "React logo",
    width: 108,
    height: 96,
    eager: false,
  },
  {
    href: "https://workers.cloudflare.com/",
    src: "/Cloudflare_Logo.svg",
    alt: "Cloudflare logo",
    width: 222,
    height: 96,
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
              width={logo.width}
              height={logo.height}
              fetchPriority={logo.eager ? "high" : "auto"}
              loading={logo.eager ? "eager" : "lazy"}
              decoding="async"
              className="h-24 w-auto opacity-80 transition-opacity duration-300 hover:opacity-100 motion-reduce:transition-none"
            />
          </a>
        ))}
      </div>

      <h1 className="mt-8 text-5xl/tight md:text-6xl">
        Vite + React + Cloudflare
      </h1>

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

      <div className="mt-6">
        <CopyPromptButton />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}
