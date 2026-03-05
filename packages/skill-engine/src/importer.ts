import { access, lstat, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { FileType, SkillFrontmatter, ValidationError } from "@uberskills/types";
import AdmZip from "adm-zip";
import { parseSkillMd } from "./parser";
import { validateSkill } from "./validator";

/** Text file extensions allowed for auxiliary skill files (prompts & resources). */
const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".csv",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".py",
  ".sh",
  ".sql",
]);

/** Subdirectories scanned for auxiliary files within a skill directory. */
const AUXILIARY_SUBDIRS = ["prompts", "resources"] as const;

/** A single file discovered within a skill directory. */
export interface ImportedFile {
  path: string;
  content: string;
  type: FileType;
}

/** Result of importing a single skill from a directory or zip. */
export interface ImportResult {
  skill: { frontmatter: SkillFrontmatter; content: string };
  files: ImportedFile[];
  valid: boolean;
  errors: ValidationError[];
  /** Filesystem path or zip entry path where the skill was found. */
  source: string;
}

/** Check whether `filePath` resolves within `root` and is not a symlink. */
async function isSafePath(filePath: string, root: string): Promise<boolean> {
  const canonical = resolve(filePath);
  const canonicalRoot = resolve(root);

  if (!canonical.startsWith(`${canonicalRoot}/`) && canonical !== canonicalRoot) {
    return false;
  }

  try {
    const stat = await lstat(filePath);
    return !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/** Check whether a filename has an extension in the allowed set. */
function hasAllowedExtension(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return false;
  return ALLOWED_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

/** Infer file type from its relative path: files under `prompts/` are prompts, rest are resources. */
function inferFileType(relativePath: string): FileType {
  return relativePath.startsWith("prompts/") ? "prompt" : "resource";
}

/**
 * Recursively collect safe, allowed files from `dir`.
 *
 * Returns relative paths (prefixed with `prefix`) alongside absolute paths.
 * Skips symlinks, files outside `root`, and files with disallowed extensions.
 */
async function collectFiles(
  dir: string,
  root: string,
  prefix: string,
): Promise<{ relativePath: string; absolutePath: string }[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [] as const);
  if (entries.length === 0) return [];

  const results: { relativePath: string; absolutePath: string }[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (!(await isSafePath(fullPath, root))) continue;

    if (entry.isDirectory()) {
      const nested = await collectFiles(fullPath, root, relPath);
      results.push(...nested);
    } else if (entry.isFile() && hasAllowedExtension(entry.name)) {
      results.push({ relativePath: relPath, absolutePath: fullPath });
    }
  }

  return results;
}

/**
 * Import a single skill from a directory containing a SKILL.md file.
 *
 * Parses the SKILL.md, collects auxiliary files from `prompts/` and `resources/`
 * subdirectories, and validates the resulting skill.
 */
async function importSingleSkill(skillDir: string, root: string): Promise<ImportResult> {
  const raw = await readFile(join(skillDir, "SKILL.md"), "utf-8");
  const { frontmatter, content } = parseSkillMd(raw);
  const { valid, errors } = validateSkill(frontmatter, content);

  const files: ImportedFile[] = [];
  for (const subdir of AUXILIARY_SUBDIRS) {
    const collected = await collectFiles(join(skillDir, subdir), root, subdir);

    for (const { relativePath, absolutePath } of collected) {
      files.push({
        path: relativePath,
        content: await readFile(absolutePath, "utf-8"),
        type: inferFileType(relativePath),
      });
    }
  }

  return {
    skill: { frontmatter, content },
    files,
    valid,
    errors,
    source: skillDir,
  };
}

/**
 * Check whether a file exists at the given path (without following symlinks).
 * Uses `access` which is lighter than `lstat` for a simple existence check.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively scan a directory for skill directories (those containing SKILL.md).
 *
 * Returns an ImportResult for each discovered skill, with parsing, file
 * detection, and validation applied.
 *
 * Security: rejects symlinks and paths that escape the source directory.
 */
export async function importFromDirectory(dirPath: string): Promise<ImportResult[]> {
  const root = resolve(dirPath);

  // If this directory itself contains a SKILL.md, import it directly
  if (await fileExists(join(root, "SKILL.md"))) {
    return [await importSingleSkill(root, root)];
  }

  // Otherwise scan subdirectories for skills
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [] as const);
  if (entries.length === 0) return [];

  const results: ImportResult[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const subdir = join(root, entry.name);
    if (!(await isSafePath(subdir, root))) continue;

    const subResults = await importFromDirectory(subdir);
    results.push(...subResults);
  }

  return results;
}

/**
 * Import skills from a zip buffer.
 *
 * Extracts the zip to a temporary directory, scans for skill directories,
 * and cleans up the temp directory after processing.
 * Source paths in results are rewritten to be zip-relative (not temp-dir absolute).
 */
export async function importFromZip(buffer: Buffer): Promise<ImportResult[]> {
  const tempDir = await mkdtemp(join(tmpdir(), "uberskills-import-"));

  try {
    const zip = new AdmZip(buffer);
    zip.extractAllTo(tempDir, true);

    const results = await importFromDirectory(tempDir);

    // Rewrite source paths from temp-dir absolute to zip-relative
    for (const result of results) {
      result.source = result.source.replace(tempDir, "").replace(/^\//, "") || ".";
    }

    return results;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
