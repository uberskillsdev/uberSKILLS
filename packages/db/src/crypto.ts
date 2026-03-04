import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Returns the 32-byte encryption key for AES-256-GCM.
 *
 * Resolution order:
 * 1. `ENCRYPTION_SECRET` environment variable (hex-encoded, 64 chars).
 * 2. Auto-generated key persisted at `data/.secret`.
 *
 * If neither exists, a new random key is generated and written to `data/.secret`.
 */
export function getEncryptionKey(): Buffer {
  const envSecret = process.env.ENCRYPTION_SECRET;
  if (envSecret) {
    return Buffer.from(envSecret, "hex");
  }

  const secretPath = resolve(process.cwd(), "data/.secret");

  if (existsSync(secretPath)) {
    const hex = readFileSync(secretPath, "utf-8").trim();
    return Buffer.from(hex, "hex");
  }

  const key = randomBytes(32);
  const dir = dirname(secretPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(secretPath, key.toString("hex"), { mode: 0o600 });
  return key;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Output format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string produced by `encrypt()`.
 *
 * Expected format: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
 *
 * @throws {Error} If the ciphertext format is invalid or decryption fails (wrong key / tampered data).
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format: expected iv:authTag:data");
  }

  const [ivHex, authTagHex, dataHex] = parts as [string, string, string];
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(dataHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
