import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { DeployTarget, Skill, SkillFile } from "@uberskills/types";
import archiver from "archiver";
import { generateSkillMd } from "./generator";

/** Skills root directory per deploy target. */
const SKILLS_ROOTS: Record<DeployTarget, string> = {
  "claude-code": join(homedir(), ".claude", "skills"),
  codex: join(homedir(), ".codex", "skills"),
  openclaw: join(homedir(), ".openclaw", "skills"),
  opencode: join(homedir(), ".config", "opencode", "skills"),
};

/** Returns the skills root directory for a given deploy target. */
export function getSkillsRoot(target: DeployTarget): string {
  return SKILLS_ROOTS[target];
}

/**
 * Generate a zip archive buffer containing a skill and its associated files.
 *
 * Zip structure:
 *   <slug>/SKILL.md
 *   <slug>/scripts/...
 *   <slug>/references/...
 */
export async function exportToZip(skill: Skill, files: SkillFile[]): Promise<Buffer> {
  const skillMd = generateSkillMd(
    {
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      model_pattern: skill.modelPattern ?? undefined,
    },
    skill.content,
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  // Collect archive output into memory
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Add the main SKILL.md
  archive.append(skillMd, { name: `${skill.slug}/SKILL.md` });

  // Add associated files in their type-based subdirectories
  for (const file of files) {
    const entryPath = `${skill.slug}/${file.path}`;
    archive.append(file.content, { name: entryPath });
  }

  await archive.finalize();

  return Buffer.concat(chunks);
}

/**
 * Deploy a skill and its files to the local filesystem.
 *
 * Writes to the skills directory for the given deploy target (defaults to Claude Code).
 * Creates directories as needed and overwrites existing files.
 *
 * Returns the absolute path of the deployed skill directory.
 *
 * @throws if the resolved path escapes the target's skills root (path traversal prevention)
 */
export async function deployToFilesystem(
  skill: Skill,
  files: SkillFile[],
  target: DeployTarget = "claude-code",
): Promise<string> {
  const root = SKILLS_ROOTS[target];
  const skillDir = resolve(root, skill.slug);

  // Path traversal guard: deployed directory must live within the skills root
  const canonicalRoot = resolve(root);
  const canonicalDir = resolve(skillDir);
  if (!canonicalDir.startsWith(`${canonicalRoot}/`) && canonicalDir !== canonicalRoot) {
    throw new Error(`Path traversal detected: target must be within ${root}`);
  }

  const skillMd = generateSkillMd(
    {
      name: skill.name,
      description: skill.description,
      trigger: skill.trigger,
      model_pattern: skill.modelPattern ?? undefined,
    },
    skill.content,
  );

  // Ensure the skill directory exists
  await mkdir(skillDir, { recursive: true });

  // Write SKILL.md
  await writeFile(join(skillDir, "SKILL.md"), skillMd, "utf-8");

  // Write associated files, creating subdirectories as needed
  for (const file of files) {
    const filePath = resolve(skillDir, file.path);

    // Ensure the file path stays within the skill directory
    if (!filePath.startsWith(`${canonicalDir}/`)) {
      throw new Error(`Path traversal detected in file path: ${file.path}`);
    }

    await mkdir(resolve(filePath, ".."), { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
  }

  return skillDir;
}
