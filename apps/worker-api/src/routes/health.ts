import { HealthResponseSchema } from "@repo/dtos-common/api";
import { Hono } from "hono";

type HealthEnv = {
  Bindings: Env;
};

const health = new Hono<HealthEnv>();

health.get("/", (c) => {
  const response = { status: "ok" };
  HealthResponseSchema.parse(response);
  return c.json(response, 200, {
    "Cache-Control": "no-store",
    // Opaque infrastructure metadata for smoke / override verification.
    "X-Worker-Version-Id": c.env.CF_VERSION_METADATA.id,
  });
});

export default health;
export type HealthRoute = typeof health;
