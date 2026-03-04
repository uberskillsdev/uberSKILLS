import { describe, expect, it } from "vitest";
import { invalidateModelCache } from "../use-models";

describe("invalidateModelCache", () => {
  it("is callable without errors", () => {
    expect(() => invalidateModelCache()).not.toThrow();
  });

  it("can be called multiple times safely", () => {
    invalidateModelCache();
    invalidateModelCache();
    expect(true).toBe(true);
  });
});
