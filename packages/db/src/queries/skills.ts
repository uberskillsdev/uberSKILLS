import type { SkillStatus } from "@uberskillz/types";
import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import { getDb } from "../client";
import { skills } from "../schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sort keys for listing skills. */
export type SkillSortKey = "updated" | "name_asc" | "name_desc" | "newest" | "oldest";

/** Options for listing skills with search, filtering, and pagination. */
export interface ListSkillsOptions {
  /** Free-text search across name, description, and tags. */
  search?: string;
  /** Filter by skill status. */
  status?: SkillStatus;
  /** 1-based page number (default: 1). */
  page?: number;
  /** Results per page (default: 12). */
  limit?: number;
  /** Sort order (default: "updated" — most recently updated first). */
  sort?: SkillSortKey;
}

/** Paginated result from `listSkills`. */
export interface ListSkillsResult {
  data: (typeof skills.$inferSelect)[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Fields accepted when creating a new skill. */
export interface CreateSkillInput {
  name: string;
  description?: string;
  trigger?: string;
  tags?: string[];
  modelPattern?: string | null;
  content?: string;
  status?: SkillStatus;
}

/** Fields accepted when updating an existing skill (all optional). */
export interface UpdateSkillInput {
  name?: string;
  description?: string;
  trigger?: string;
  tags?: string[];
  modelPattern?: string | null;
  content?: string;
  status?: SkillStatus;
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

/**
 * Converts a skill name into a URL-safe slug.
 * Lowercases, replaces non-alphanumeric runs with hyphens, trims leading/trailing hyphens.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generates a unique slug for a skill name.
 * If the base slug already exists, appends an incrementing numeric suffix (e.g. `my-skill-2`).
 *
 * @param name - The skill name to generate a slug from.
 * @param excludeId - Optional skill ID to exclude from collision checks (for updates).
 */
function generateUniqueSlug(name: string, excludeId?: string): string {
  const db = getDb();
  const base = slugify(name);

  // Check if the base slug is available
  const existing = db.select({ id: skills.id }).from(skills).where(eq(skills.slug, base)).get();

  if (!existing || existing.id === excludeId) {
    return base;
  }

  // Find the next available numeric suffix
  let suffix = 2;
  while (true) {
    const candidate = `${base}-${suffix}`;
    const collision = db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.slug, candidate))
      .get();

    if (!collision || collision.id === excludeId) {
      return candidate;
    }
    suffix++;
  }
}

// ---------------------------------------------------------------------------
// CRUD functions
// ---------------------------------------------------------------------------

/**
 * Lists skills with optional search, status filter, pagination, and sort order.
 * Defaults to sorting by `updated_at` descending (most recently updated first).
 */
export function listSkills(options: ListSkillsOptions = {}): ListSkillsResult {
  const db = getDb();
  const { search, status, page = 1, limit = 12, sort = "updated" } = options;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];

  if (status) {
    conditions.push(eq(skills.status, status));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(like(skills.name, pattern), like(skills.description, pattern), like(skills.tags, pattern)),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Resolve sort column and direction
  const orderBy = (() => {
    switch (sort) {
      case "name_asc":
        return asc(skills.name);
      case "name_desc":
        return desc(skills.name);
      case "newest":
        return desc(skills.createdAt);
      case "oldest":
        return asc(skills.createdAt);
      default:
        return desc(skills.updatedAt);
    }
  })();

  // Get total count for pagination
  const [totalRow] = db.select({ count: count() }).from(skills).where(where).all();
  const total = totalRow?.count ?? 0;

  // Get paginated results
  const data = db
    .select()
    .from(skills)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)
    .all();

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Returns a single skill by its ID, or `null` if not found.
 */
export function getSkillById(id: string): typeof skills.$inferSelect | null {
  const db = getDb();
  return db.select().from(skills).where(eq(skills.id, id)).get() ?? null;
}

/**
 * Returns a single skill by its slug, or `null` if not found.
 */
export function getSkillBySlug(slug: string): typeof skills.$inferSelect | null {
  const db = getDb();
  return db.select().from(skills).where(eq(skills.slug, slug)).get() ?? null;
}

/**
 * Creates a new skill.
 * Auto-generates an ID (nanoid), a unique slug from the name, and timestamps.
 */
export function createSkill(input: CreateSkillInput): typeof skills.$inferSelect {
  const db = getDb();
  const slug = generateUniqueSlug(input.name);
  const now = new Date();

  const rows = db
    .insert(skills)
    .values({
      name: input.name,
      slug,
      description: input.description ?? "",
      trigger: input.trigger ?? "",
      tags: input.tags ? JSON.stringify(input.tags) : "[]",
      modelPattern: input.modelPattern ?? null,
      content: input.content ?? "",
      status: input.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all();

  return rows[0] as typeof skills.$inferSelect;
}

/**
 * Partially updates a skill by ID. Only provided fields are changed.
 * Automatically bumps `updated_at` and re-generates the slug if the name changes.
 *
 * Returns the updated skill, or `null` if the skill was not found.
 */
export function updateSkill(
  id: string,
  input: UpdateSkillInput,
): typeof skills.$inferSelect | null {
  const db = getDb();

  // Build the update payload with only provided fields
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updates.name = input.name;
    updates.slug = generateUniqueSlug(input.name, id);
  }
  if (input.description !== undefined) updates.description = input.description;
  if (input.trigger !== undefined) updates.trigger = input.trigger;
  if (input.tags !== undefined) updates.tags = JSON.stringify(input.tags);
  if (input.modelPattern !== undefined) updates.modelPattern = input.modelPattern;
  if (input.content !== undefined) updates.content = input.content;
  if (input.status !== undefined) updates.status = input.status;

  const [updated] = db.update(skills).set(updates).where(eq(skills.id, id)).returning().all();

  return updated ?? null;
}

/**
 * Deletes a skill by ID. Related skill_files, skill_versions, and test_runs
 * are automatically removed via foreign key CASCADE constraints.
 *
 * Returns `true` if the skill was found and deleted, `false` otherwise.
 */
export function deleteSkill(id: string): boolean {
  const result = getDb().delete(skills).where(eq(skills.id, id)).returning().all();
  return result.length > 0;
}
