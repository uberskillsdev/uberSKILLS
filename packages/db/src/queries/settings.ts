import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { decrypt, encrypt } from "../crypto";
import { settings } from "../schema";

// ---------------------------------------------------------------------------
// CRUD functions
// ---------------------------------------------------------------------------

/**
 * Returns a single setting value by key, or `null` if the key does not exist.
 * Encrypted values are returned as-is (still encrypted).
 */
export function getSetting(key: string): typeof settings.$inferSelect | null {
  const db = getDb();
  return db.select().from(settings).where(eq(settings.key, key)).get() ?? null;
}

/**
 * Sets a setting value by key. Creates the row if it doesn't exist, updates it otherwise.
 *
 * When `encrypted` is `true`, the value is encrypted via AES-256-GCM before storage.
 */
export function setSetting(key: string, value: string, encrypted = false): void {
  const db = getDb();
  const storedValue = encrypted ? encrypt(value) : value;
  const now = new Date();

  db.insert(settings)
    .values({ key, value: storedValue, encrypted, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: storedValue, encrypted, updatedAt: now },
    })
    .run();
}

/**
 * Returns all settings rows. Encrypted values remain encrypted in the result.
 */
export function getAllSettings(): (typeof settings.$inferSelect)[] {
  const db = getDb();
  return db.select().from(settings).all();
}

/**
 * Retrieves and decrypts the OpenRouter API key from the settings table.
 *
 * Returns the plaintext key, or `null` if no key is stored.
 *
 * @throws {Error} If decryption fails (wrong key or tampered data).
 */
export function getDecryptedApiKey(): string | null {
  const row = getSetting("openrouterApiKey");
  if (!row) {
    return null;
  }

  // If the value was stored without encryption, return as-is
  if (!row.encrypted) {
    return row.value;
  }

  return decrypt(row.value);
}
