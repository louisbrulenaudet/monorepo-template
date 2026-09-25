import { vi } from "vitest";

export function stubFetchJson(body: unknown, init?: ResponseInit) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json(body, init)),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
