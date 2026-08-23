import { afterEach, beforeEach, vi } from "vitest";
import { resetCorrelationIdCache } from "#/utils/correlation-id";

const memory = new Map<string, string>();

function stubSessionStorage(): void {
  memory.clear();
  resetCorrelationIdCache();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
    key: () => null,
    get length() {
      return memory.size;
    },
  } satisfies Storage);
}

export function installSessionStorageHooks(): void {
  beforeEach(() => {
    stubSessionStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetCorrelationIdCache();
  });
}
