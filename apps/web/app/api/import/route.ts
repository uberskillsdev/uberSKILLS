import {
  createFile,
  createSkill,
  createVersion,
  getSkillBySlug,
  updateSkill,
} from "@uberskills/db";
import type { ImportResult } from "@uberskills/skill-engine/server";
import { importFromDirectory, importFromZip } from "@uberskills/skill-engine/server";
import { NextResponse } from "next/server";

import { routeLogger } from "@/lib/logger";

const log = routeLogger("POST", "/api/import");

/** Slug derived from a skill name, matching the DB's slugify logic. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Shape of a skill selected for database insertion during the confirm step. */
interface SelectedSkill {
  frontmatter: {
    name: string;
    description: string;
    trigger: string;
    model_pattern?: string;
  };
  content: string;
  files: { path: string; content: string; type: "prompt" | "resource" }[];
  /** When true, overwrites an existing skill with the same slug. */
  overwrite?: boolean;
}

/** Enrich import results with slug conflict information. */
function addConflictInfo(
  results: ImportResult[],
): (ImportResult & { slug: string; conflict: boolean })[] {
  return results.map((r) => {
    const slug = slugify(r.skill.frontmatter.name);
    const existing = getSkillBySlug(slug);
    return { ...r, slug, conflict: existing !== null };
  });
}

// POST /api/import — scan/upload skills or confirm selection for database insertion
export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";

  // --- Multipart zip upload ---
  if (contentType.includes("multipart/form-data")) {
    return handleZipUpload(request);
  }

  // --- JSON body: directory scan or confirm ---
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  const type = body.type;

  if (type === "directory") {
    return handleDirectoryScan(body);
  }

  if (type === "confirm") {
    return handleConfirm(body);
  }

  return NextResponse.json(
    {
      error:
        'Invalid request type. Use multipart form for zip upload, or JSON with type "directory" or "confirm".',
      code: "INVALID_TYPE",
    },
    { status: 400 },
  );
}

/** Handle zip file upload via multipart form data. */
async function handleZipUpload(request: Request): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse multipart form data", code: "INVALID_FORM_DATA" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing "file" field in multipart form', code: "MISSING_FILE" },
      { status: 400 },
    );
  }

  if (!file.name.endsWith(".zip")) {
    return NextResponse.json(
      { error: "Only .zip files are supported", code: "INVALID_FILE_TYPE" },
      { status: 400 },
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const results = await importFromZip(buffer);
    log.debug({ type: "zip" }, "import scanned");
    log.info({ count: results.length }, "skills parsed from zip");
    return NextResponse.json({ skills: addConflictInfo(results) });
  } catch {
    return NextResponse.json(
      { error: "Failed to process zip file. Ensure it is a valid zip archive.", code: "ZIP_ERROR" },
      { status: 400 },
    );
  }
}

/** Handle directory scan via JSON body: { type: "directory", path: string }. */
async function handleDirectoryScan(body: Record<string, unknown>): Promise<NextResponse> {
  const path = body.path;
  if (!path || typeof path !== "string") {
    return NextResponse.json(
      { error: '"path" is required and must be a string', code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const results = await importFromDirectory(path);
    log.debug({ type: "directory", path }, "import scanned");
    log.info({ count: results.length }, "skills parsed from directory");
    return NextResponse.json({ skills: addConflictInfo(results) });
  } catch {
    return NextResponse.json(
      { error: `Failed to scan directory: ${path}`, code: "DIRECTORY_ERROR" },
      { status: 400 },
    );
  }
}

/**
 * Handle confirm step: { type: "confirm", skills: SelectedSkill[] }.
 *
 * Saves selected skills to the database, creating skills, skill_files,
 * and initial skill_versions rows. Supports overwrite for conflicting slugs.
 */
async function handleConfirm(body: Record<string, unknown>): Promise<NextResponse> {
  const rawSkills = body.skills;
  if (!Array.isArray(rawSkills) || rawSkills.length === 0) {
    return NextResponse.json(
      { error: '"skills" must be a non-empty array', code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const selectedSkills = rawSkills as SelectedSkill[];
  const imported: { id: string; name: string; slug: string; action: "created" | "updated" }[] = [];

  try {
    for (const selected of selectedSkills) {
      const { frontmatter, content, files, overwrite } = selected;

      if (!frontmatter?.name || typeof frontmatter.name !== "string") {
        return NextResponse.json(
          { error: "Each skill must have a frontmatter.name", code: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }

      const slug = slugify(frontmatter.name);
      const existing = getSkillBySlug(slug);

      // Conflict without overwrite flag → reject
      if (existing && !overwrite) {
        return NextResponse.json(
          {
            error: `Skill with slug "${slug}" already exists. Set overwrite: true to replace it.`,
            code: "CONFLICT",
          },
          { status: 409 },
        );
      }

      const description = frontmatter.description ?? "";
      const trigger = frontmatter.trigger ?? "";
      const modelPattern = frontmatter.model_pattern ?? null;
      const skillContent = content ?? "";

      const skillData = {
        name: frontmatter.name,
        description,
        trigger,
        modelPattern,
        content: skillContent,
      };

      // Update existing skill or create a new one
      const isUpdate = existing !== null && overwrite === true;
      let skillId: string;
      let skillSlug: string;

      if (isUpdate) {
        updateSkill(existing.id, skillData);
        skillId = existing.id;
        skillSlug = slug;
      } else {
        const created = createSkill(skillData);
        skillId = created.id;
        skillSlug = created.slug;
      }

      createVersion({
        skillId,
        contentSnapshot: skillContent,
        metadataSnapshot: JSON.stringify({
          name: frontmatter.name,
          description,
          trigger,
          model_pattern: modelPattern,
        }),
        changeSummary: isUpdate ? "Imported (overwrite)" : "Initial version (imported)",
      });

      for (const file of files ?? []) {
        createFile({ skillId, path: file.path, content: file.content, type: file.type });
      }

      imported.push({
        id: skillId,
        name: frontmatter.name,
        slug: skillSlug,
        action: isUpdate ? "updated" : "created",
      });
    }

    log.info({ count: imported.length }, "skills imported");
    return NextResponse.json({ imported }, { status: 201 });
  } catch (err) {
    log.error({ err }, "failed to save imported skills");
    return NextResponse.json(
      { error: "Failed to save imported skills to database", code: "IMPORT_SAVE_ERROR" },
      { status: 500 },
    );
  }
}
