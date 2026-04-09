// src/routes/health.ts

import { HealthResponseSchema } from "@repo/dtos-common/api";
import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => {
  const response = { status: "ok" };
  HealthResponseSchema.parse(response);
  return c.json(response);
});

export default health;
export type HealthRoute = typeof health;
