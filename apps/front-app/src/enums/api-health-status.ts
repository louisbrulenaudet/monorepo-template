export const ApiHealthStatus = {
  IDLE: "idle",
  CHECKING: "checking",
  HEALTHY: "healthy",
  UNHEALTHY: "unhealthy",
} as const;

export type ApiHealthStatus =
  (typeof ApiHealthStatus)[keyof typeof ApiHealthStatus];
