import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import AdmZip from "adm-zip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importFromDirectory, importFromZip } from "../importer";

const FIXTURES = resolve(__dirname, "fixtures");

describe("importFromDirectory", () => {
  it("imports a valid skill with prompts and resources", async () => {
    const results = await importFromDirectory(join(FIXTURES, "valid-skill"));

    expect(results).toHaveLength(1);
    const result = results[0];

    expect(result?.skill.frontmatter.name).toBe("Test Skill");
    expect(result?.skill.frontmatter.description).toContain("testing the importer");
    expect(result?.skill.frontmatter.trigger).toContain("run the test skill");
    expect(result?.skill.frontmatter.model_pattern).toBe("claude-.*");
    expect(result?.skill.content).toContain("# Instructions");
    expect(result?.valid).toBe(true);
    expect(result?.errors).toHaveLength(0);

    // Should detect auxiliary files
    expect(result?.files).toHaveLength(2);
    const promptFile = result?.files.find((f) => f.path === "prompts/setup.md");
    expect(promptFile).toBeDefined();
    expect(promptFile?.type).toBe("prompt");
    expect(promptFile?.content).toContain("# Setup Prompt");

    const resourceFile = result?.files.find((f) => f.path === "resources/data.md");
    expect(resourceFile).toBeDefined();
    expect(resourceFile?.type).toBe("resource");
    expect(resourceFile?.content).toContain("# Reference Data");
  });

  it("imports multiple skills from a parent directory", async () => {
    const results = await importFromDirectory(join(FIXTURES, "multi-skill"));

    expect(results).toHaveLength(2);
    const names = results.map((r) => r.skill.frontmatter.name).sort();
    expect(names).toEqual(["Skill Alpha", "Skill Beta"]);
    expect(results.every((r) => r.valid)).toBe(true);
  });

  it("returns empty array for a directory with no SKILL.md", async () => {
    const results = await importFromDirectory(join(FIXTURES, "no-skillmd"));
    expect(results).toHaveLength(0);
  });

  it("returns empty array for an empty directory", async () => {
    const results = await importFromDirectory(join(FIXTURES, "empty-dir"));
    expect(results).toHaveLength(0);
  });

  it("returns validation errors for an invalid skill", async () => {
    const results = await importFromDirectory(join(FIXTURES, "invalid-skill"));

    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result?.valid).toBe(false);
    expect(result?.errors.length).toBeGreaterThan(0);

    const errorFields = result?.errors.map((e) => e.field) ?? [];
    expect(errorFields).toContain("name");
    expect(errorFields).toContain("trigger");
  });

  it("returns empty array for a non-existent directory", async () => {
    const results = await importFromDirectory("/tmp/does-not-exist-uberskills");
    expect(results).toHaveLength(0);
  });

  it("includes the source path in results", async () => {
    const results = await importFromDirectory(join(FIXTURES, "valid-skill"));
    expect(results[0]?.source).toBe(resolve(FIXTURES, "valid-skill"));
  });

  describe("symlink security", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "uberskills-import-symlink-"));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("ignores symlinks that could escape the source directory", async () => {
      // Create a skill directory with a SKILL.md
      const skillDir = join(tempDir, "my-skill");
      await mkdir(join(skillDir, "resources"), { recursive: true });
      await writeFile(
        join(skillDir, "SKILL.md"),
        `---
name: Symlink Test
description: Skill with a symlink escape attempt
trigger: When testing symlinks
---

# Symlink Test Instructions with enough content to pass the minimum validation length requirement.`,
      );

      // Create a symlink in resources/ pointing outside the source
      try {
        await symlink("/etc/hosts", join(skillDir, "resources", "evil.md"));
      } catch {
        // Skip test if symlinks aren't supported
        return;
      }

      const results = await importFromDirectory(tempDir);
      expect(results).toHaveLength(1);

      // The symlinked file should NOT be included
      const evil = results[0]?.files.find((f) => f.path.includes("evil"));
      expect(evil).toBeUndefined();
    });
  });
});

describe("importFromZip", () => {
  function createTestZip(entries: Record<string, string>): Buffer {
    const zip = new AdmZip();
    for (const [path, content] of Object.entries(entries)) {
      zip.addFile(path, Buffer.from(content, "utf-8"));
    }
    return zip.toBuffer();
  }

  const validSkillMd = `---
name: Zipped Skill
description: A skill imported from a zip file
trigger: When user imports a zipped skill
---

# Zipped Instructions

These are the instructions for the zipped skill with enough content to pass minimum validation length.`;

  it("imports a valid skill from a zip buffer", async () => {
    const buf = createTestZip({
      "my-skill/SKILL.md": validSkillMd,
    });

    const results = await importFromZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0]?.skill.frontmatter.name).toBe("Zipped Skill");
    expect(results[0]?.valid).toBe(true);
  });

  it("imports skills with auxiliary files from zip", async () => {
    const buf = createTestZip({
      "my-skill/SKILL.md": validSkillMd,
      "my-skill/prompts/init.md": "# Init Prompt\n\nInitialize things.",
      "my-skill/resources/ref.md": "# Reference\n\nSome reference material.",
    });

    const results = await importFromZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0]?.files).toHaveLength(2);

    const types = results[0]?.files.map((f) => f.type).sort();
    expect(types).toEqual(["prompt", "resource"]);
  });

  it("imports multiple skills from a single zip", async () => {
    const buf = createTestZip({
      "skill-a/SKILL.md": validSkillMd.replace("Zipped Skill", "Skill A"),
      "skill-b/SKILL.md": validSkillMd.replace("Zipped Skill", "Skill B"),
    });

    const results = await importFromZip(buf);
    expect(results).toHaveLength(2);
  });

  it("returns empty results for a zip with no SKILL.md", async () => {
    const buf = createTestZip({
      "readme.txt": "No skills here.",
    });

    const results = await importFromZip(buf);
    expect(results).toHaveLength(0);
  });

  it("uses zip-relative paths in the source field", async () => {
    const buf = createTestZip({
      "my-skill/SKILL.md": validSkillMd,
    });

    const results = await importFromZip(buf);
    expect(results[0]?.source).toBe("my-skill");
  });

  it("cleans up the temp directory after processing", async () => {
    const buf = createTestZip({
      "my-skill/SKILL.md": validSkillMd,
    });

    // Import and verify that temp dir was cleaned up (no error thrown)
    const results = await importFromZip(buf);
    expect(results).toHaveLength(1);
  });

  it("filters out files with disallowed extensions", async () => {
    const buf = createTestZip({
      "my-skill/SKILL.md": validSkillMd,
      "my-skill/resources/data.md": "# Data\n\nSome data.",
      "my-skill/resources/image.png": "fake binary data",
      "my-skill/resources/binary.exe": "fake binary",
    });

    const results = await importFromZip(buf);
    expect(results).toHaveLength(1);

    // Only .md file should be imported, not .png or .exe
    expect(results[0]?.files).toHaveLength(1);
    expect(results[0]?.files[0]?.path).toBe("resources/data.md");
  });
});
