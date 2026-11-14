import { afterEach, expect, it, vi } from "vitest";
import { BUNDLE_TIMEOUT_MS, loadBundle } from "./validate";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("gives up on a stalled bundle request so the screen can offer a retry", async () => {
  vi.useFakeTimers();
  // A fetch that only settles when its signal aborts, like a stalled mobile connection.
  vi.stubGlobal("fetch", (_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
  const pending = loadBundle("genzano-demo");
  const outcome = expect(pending).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(BUNDLE_TIMEOUT_MS);
  await outcome;
});
