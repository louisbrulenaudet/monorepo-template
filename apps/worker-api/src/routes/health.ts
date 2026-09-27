import type { HealthResponse } from "@repo/dtos-common/api";
import type { Context } from "hono";
import { Hono } from "hono";
import { version } from "../../package.json";

type HealthEnv = {
  Bindings: Env;
};

const health = new Hono<HealthEnv>();

function getHealth(c: Context<HealthEnv>): Response {
  const payload: HealthResponse = { status: "ok", version };
  return c.json(payload, 200, {
    "Cache-Control": "no-store",
    "X-Worker-Version-Id": c.env.CF_VERSION_METADATA.id,
  });
}

health.get("/", getHealth);

export default health;
