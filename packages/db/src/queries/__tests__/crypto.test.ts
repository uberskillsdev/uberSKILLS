import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const SECRET_DIR = resolve(process.cwd(), "data/test-crypto-secret");

describe("crypto module", () => {
  beforeAll(() => {
    // Ensure clean state
    if (existsSync(SECRET_DIR)) {
      rmSync(SECRET_DIR, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up test artifacts
    if (existsSync(SECRET_DIR)) {
      rmSync(SECRET_DIR, { recursive: true, force: true });
    }
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // Reset the module cache so each test gets fresh key resolution
    vi.resetModules();
  });

  it("encrypts and decrypts a string round-trip", async () => {
    // Use a fixed env key for deterministic testing
    const testKey = "a".repeat(64); // 32 bytes in hex
    vi.stubEnv("ENCRYPTION_SECRET", testKey);

    const { encrypt, decrypt } = await import("../../crypto");

    const plaintext = "sk-or-v1-my-secret-api-key-12345";
    const ciphertext = encrypt(plaintext);

    // Ciphertext should be different from plaintext
    expect(ciphertext).not.toBe(plaintext);

    // Format check: iv:authTag:data (hex segments)
    const parts = ciphertext.split(":");
    expect(parts.length).toBe(3);

    // Round-trip decryption
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const testKey = "b".repeat(64);
    vi.stubEnv("ENCRYPTION_SECRET", testKey);

    const { encrypt } = await import("../../crypto");

    const plaintext = "same-input";
    const ct1 = encrypt(plaintext);
    const ct2 = encrypt(plaintext);

    // Different IVs should produce different ciphertexts
    expect(ct1).not.toBe(ct2);
  });

  it("throws on invalid ciphertext format", async () => {
    const testKey = "c".repeat(64);
    vi.stubEnv("ENCRYPTION_SECRET", testKey);

    const { decrypt } = await import("../../crypto");

    expect(() => decrypt("not-valid-format")).toThrow("Invalid ciphertext format");
    expect(() => decrypt("only:two")).toThrow("Invalid ciphertext format");
  });

  it("throws on tampered ciphertext (wrong auth tag)", async () => {
    const testKey = "d".repeat(64);
    vi.stubEnv("ENCRYPTION_SECRET", testKey);

    const { encrypt, decrypt } = await import("../../crypto");

    const ciphertext = encrypt("sensitive data");
    const parts = ciphertext.split(":");
    // Tamper with the auth tag
    parts[1] = "0".repeat(32);
    const tampered = parts.join(":");

    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles empty string encryption", async () => {
    const testKey = "e".repeat(64);
    vi.stubEnv("ENCRYPTION_SECRET", testKey);

    const { encrypt, decrypt } = await import("../../crypto");

    const ciphertext = encrypt("");
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe("");
  });

  it("handles unicode content", async () => {
    const testKey = "f".repeat(64);
    vi.stubEnv("ENCRYPTION_SECRET", testKey);

    const { encrypt, decrypt } = await import("../../crypto");

    const plaintext = "Hello, World! Olá Mundo! 你好世界 🔑";
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });
});
