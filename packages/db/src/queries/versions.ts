import { desc, eq, max } from "drizzle-orm";
import { getDb } from "../client";
import { skillVersions } from "../schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields accepted when creating a new skill version. */
export interface CreateVersionInput {
  skillId: string;
  contentSnapshot: string;
  /** Frontmatter metadata serialized as a JSON string. */
  metadataSnapshot: string;
  changeSummary?: string;
}

// ---------------------------------------------------------------------------
// CRUD functions
// ---------------------------------------------------------------------------

/**
 * Lists all versions for a skill, sorted by version number descending (newest first).
 */
export function listVersions(skillId: string): (typeof skillVersions.$inferSelect)[] {
  const db = getDb();
  return db
    .select()
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .orderBy(desc(skillVersions.version))
    .all();
}

/**
 * Returns a single version by its ID, or `null` if not found.
 */
export function getVersion(id: string): typeof skillVersions.$inferSelect | null {
  const db = getDb();
  return db.select().from(skillVersions).where(eq(skillVersions.id, id)).get() ?? null;
}

/**
 * Creates a new skill version with an auto-incremented version number.
 *
 * Queries the current maximum version for the skill and increments by 1.
 * If no versions exist yet, starts at version 1.
 */
export function createVersion(input: CreateVersionInput): typeof skillVersions.$inferSelect {
  const db = getDb();

  // Determine the next version number by finding the current max
  const [maxRow] = db
    .select({ maxVersion: max(skillVersions.version) })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, input.skillId))
    .all();

  const nextVersion = (maxRow?.maxVersion ?? 0) + 1;

  const rows = db
    .insert(skillVersions)
    .values({
      skillId: input.skillId,
      version: nextVersion,
      contentSnapshot: input.contentSnapshot,
      metadataSnapshot: input.metadataSnapshot,
      changeSummary: input.changeSummary ?? "",
      createdAt: new Date(),
    })
    .returning()
    .all();

  return rows[0] as typeof skillVersions.$inferSelect;
}
