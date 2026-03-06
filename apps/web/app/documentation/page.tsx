import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uberskills/ui";
import {
  BookOpenIcon,
  BrainCircuitIcon,
  DownloadIcon,
  FileTextIcon,
  PencilIcon,
  PlayIcon,
  RocketIcon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";

export default function DocumentationPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Documentation"
        description="Learn how to create, test, and deploy Claude Code Agent Skills with uberSKILLS."
      />

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenIcon className="size-5" />
            What is uberSKILLS?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            uberSKILLS is a local-first web application for designing, testing, and deploying{" "}
            <strong className="text-foreground">Claude Code Agent Skills</strong>. Skills are
            reusable instruction sets that extend Claude Code&apos;s capabilities for specific
            tasks.
          </p>
          <p>
            The core workflow is simple: <strong className="text-foreground">Create</strong> a skill{" "}
            <span className="mx-1">&rarr;</span> <strong className="text-foreground">Edit</strong>{" "}
            its metadata and instructions <span className="mx-1">&rarr;</span>{" "}
            <strong className="text-foreground">Test</strong> with AI models{" "}
            <span className="mx-1">&rarr;</span> <strong className="text-foreground">Deploy</strong>{" "}
            to your local filesystem.
          </p>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RocketIcon className="size-5" />
            Getting Started
          </CardTitle>
          <CardDescription>First steps to start building skills.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Configure your API key</strong> &mdash; Go to{" "}
              <strong className="text-foreground">Settings</strong> in the sidebar and enter your{" "}
              <span className="font-mono text-xs">OpenRouter</span> API key. This enables AI-powered
              skill creation and testing.
            </li>
            <li>
              <strong className="text-foreground">Create your first skill</strong> &mdash; Click{" "}
              <strong className="text-foreground">Skills</strong> in the sidebar, then{" "}
              <strong className="text-foreground">New Skill</strong>. You can create skills manually
              or use AI chat to generate them from a description.
            </li>
            <li>
              <strong className="text-foreground">Test the skill</strong> &mdash; Open your skill
              and navigate to the <strong className="text-foreground">Test</strong> tab to try it
              against different AI models.
            </li>
            <li>
              <strong className="text-foreground">Deploy or export</strong> &mdash; Once satisfied,
              deploy directly to{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                ~/.claude/skills/
              </code>{" "}
              or export as a zip file.
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Feature Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* AI-Assisted Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuitIcon className="size-5" />
              AI-Assisted Creation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Navigate to <strong className="text-foreground">Skills &rarr; New Skill</strong> to
              create a skill with AI assistance:
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Select an AI model from the dropdown.</li>
              <li>Describe the skill you want in the chat panel.</li>
              <li>The AI generates a complete SKILL.md with frontmatter and instructions.</li>
              <li>
                Review, iterate, and click <strong className="text-foreground">Edit & Save</strong>.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Skill Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PencilIcon className="size-5" />
              Skill Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>The editor provides a tabbed interface for working with skills:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong className="text-foreground">Metadata</strong> &mdash; Name, description,
                trigger, tags, and model pattern.
              </li>
              <li>
                <strong className="text-foreground">Instructions</strong> &mdash; Markdown editor
                for the skill&apos;s instruction body.
              </li>
              <li>
                <strong className="text-foreground">Files</strong> &mdash; Manage prompt and
                resource files.
              </li>
              <li>
                <strong className="text-foreground">Preview</strong> &mdash; See the final SKILL.md
                output.
              </li>
              <li>
                <strong className="text-foreground">History</strong> &mdash; Browse version history.
              </li>
            </ul>
            <p>Changes are auto-saved after 3 seconds of inactivity.</p>
          </CardContent>
        </Card>

        {/* Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayIcon className="size-5" />
              Skill Testing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Test your skills in a sandbox environment:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Choose any model available on OpenRouter.</li>
              <li>Review the resolved system prompt.</li>
              <li>
                Set argument values if your skill uses{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">$ARGUMENTS</code>{" "}
                placeholders.
              </li>
              <li>Run the test and see the AI response streamed in real-time.</li>
              <li>View metrics: token counts, total latency, and time to first token.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Export & Deploy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DownloadIcon className="size-5" />
              Export & Deploy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Two ways to get your skills out of uberSKILLS:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong className="text-foreground">Zip Export</strong> &mdash; Download as a{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.zip</code> with
                the standard skill directory structure.
              </li>
              <li>
                <strong className="text-foreground">Deploy</strong> &mdash; One-click deploy writes
                the skill directly to{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  ~/.claude/skills/
                </code>
                .
              </li>
            </ul>
            <p>Both actions are available from the skill editor toolbar.</p>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadIcon className="size-5" />
              Import Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Import existing skills from external sources:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong className="text-foreground">Zip upload</strong> &mdash; Upload a{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.zip</code> file
                containing skill directories.
              </li>
              <li>
                <strong className="text-foreground">Directory scan</strong> &mdash; Provide a local
                path to scan for SKILL.md files.
              </li>
            </ul>
            <p>Skills are validated before import. Duplicates can be overwritten or skipped.</p>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SettingsIcon className="size-5" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Configure your uberSKILLS instance:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong className="text-foreground">API Key</strong> &mdash; Enter your OpenRouter
                key (encrypted at rest with AES-256-GCM).
              </li>
              <li>
                <strong className="text-foreground">Default Model</strong> &mdash; Set the default
                model for testing.
              </li>
              <li>
                <strong className="text-foreground">Theme</strong> &mdash; Light, dark, or system.
              </li>
              <li>
                <strong className="text-foreground">Data Management</strong> &mdash; Export all
                skills, backup/restore the database.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* SKILL.md Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            SKILL.md Format
          </CardTitle>
          <CardDescription>Understanding the skill file structure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Each skill is defined by a{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">SKILL.md</code> file
            with YAML frontmatter and a markdown body:
          </p>
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-xs">
            {`---
name: My Skill
description: What this skill does
trigger: When to activate this skill
tags:
  - example
  - demo
---

# Instructions

Your skill instructions go here in markdown.
Use $ARGUMENTS for dynamic placeholders.`}
          </pre>
          <p>
            The frontmatter defines metadata (name, description, trigger, tags), while the markdown
            body contains the instructions that the AI model receives as a system prompt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
