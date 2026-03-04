import type { FileType } from "@uberskillz/types";
import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { skillFiles } from "../schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields accepted when creating a new skill file. */
export interface CreateFileInput {
  skillId: string;
  path: string;
  content?: string;
  type?: FileType;
}

/** Fields accepted when updating an existing skill file (all optional). */
export interface UpdateFileInput {
  path?: string;
  content?: string;
  type?: FileType;
}

// ---------------------------------------------------------------------------
// CRUD functions
// ---------------------------------------------------------------------------

/**
 * Lists all files belonging to a skill, sorted by path ascending.
 */
export function listFiles(skillId: string): (typeof skillFiles.$inferSelect)[] {
  const db = getDb();
  return db
    .select()
    .from(skillFiles)
    .where(eq(skillFiles.skillId, skillId))
    .orderBy(skillFiles.path)
    .all();
}

/**
 * Creates a new file associated with a skill.
 */
export function createFile(input: CreateFileInput): typeof skillFiles.$inferSelect {
  const db = getDb();
  const now = new Date();

  const rows = db
    .insert(skillFiles)
    .values({
      skillId: input.skillId,
      path: input.path,
      content: input.content ?? "",
      type: input.type ?? "resource",
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all();

  return rows[0] as typeof skillFiles.$inferSelect;
}

/**
 * Partially updates a skill file by ID. Only provided fields are changed.
 * Automatically bumps `updated_at`.
 *
 * Returns the updated file, or `null` if the file was not found.
 */
export function updateFile(
  id: string,
  input: UpdateFileInput,
): typeof skillFiles.$inferSelect | null {
  const db = getDb();

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.path !== undefined) updates.path = input.path;
  if (input.content !== undefined) updates.content = input.content;
  if (input.type !== undefined) updates.type = input.type;

  const [updated] = db
    .update(skillFiles)
    .set(updates)
    .where(eq(skillFiles.id, id))
    .returning()
    .all();

  return updated ?? null;
}

/**
 * Deletes a skill file by ID.
 *
 * Returns `true` if the file was found and deleted, `false` otherwise.
 */
export function deleteFile(id: string): boolean {
  const result = getDb().delete(skillFiles).where(eq(skillFiles.id, id)).returning().all();
  return result.length > 0;
}
