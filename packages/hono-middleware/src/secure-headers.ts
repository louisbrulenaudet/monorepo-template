import { secureHeaders } from "hono/secure-headers";

export const apiSecureHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
  permissionsPolicy: {
    camera: [],
    geolocation: [],
    microphone: [],
    payment: [],
  },
});
