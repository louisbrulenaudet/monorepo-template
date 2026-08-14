import { Hono } from "hono";

type HealthEnv = {
  Bindings: Env;
};

const health = new Hono<HealthEnv>();

health.get("/", (c) => {
  return c.json({ status: "ok" as const }, 200, {
    "Cache-Control": "no-store",
    // Opaque infrastructure metadata for smoke / override verification.
    "X-Worker-Version-Id": c.env.CF_VERSION_METADATA.id,
  });
});

export default health;
