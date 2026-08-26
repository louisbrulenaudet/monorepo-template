import type { Context } from "hono";
import { Hono } from "hono";
import { version } from "../../package.json";

type HealthEnv = {
  Bindings: Env;
};

const health = new Hono<HealthEnv>();

function getHealth(c: Context<HealthEnv>): Response {
  return c.json({ status: "ok" as const, version }, 200, {
    "Cache-Control": "no-store",
    "X-Worker-Version-Id": c.env.CF_VERSION_METADATA.id,
  });
}

health.get("/", getHealth);

export default health;
