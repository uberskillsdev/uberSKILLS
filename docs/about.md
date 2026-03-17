# uberSKILLS — The Open-Source Agent Skills Workbench

## Overview

uberSKILLS is an open-source web application for designing, testing, and deploying Agent Skills — the reusable instruction sets that guide AI coding agents like Claude Code, Cursor, GitHub Copilot, Gemini CLI, and others. Instead of manually authoring SKILL.md files in a text editor, uberSKILLS provides a structured visual editor, AI-assisted creation via natural language conversation, a multi-model testing sandbox, and one-click deployment to any of eight supported agent tools.

The core workflow is straightforward: **Create** a skill manually or by describing what you need in a chat interface, **Edit** its metadata, instructions, and associated files using a tabbed editor with real-time validation, **Test** it against any model available on OpenRouter with streaming responses and usage metrics, and **Export** it as a zip file or **Deploy** it directly to the agent's skills directory on your filesystem.

uberSKILLS runs entirely on your machine. All data is stored in a local SQLite database, API keys are encrypted at rest with AES-256-GCM, and nothing is sent to external servers beyond the AI model requests routed through OpenRouter. Getting started requires a single command: `npx @uberskillsdev/uberskills`.

## Features & Functionality

**Skills Library** — A central hub for browsing, searching, filtering, and managing all your skills. Supports grid and list views, tag-based filtering, status badges (draft, ready, deployed), and paginated navigation.

**AI-Assisted Creation** — Describe the skill you want in natural language and uberSKILLS generates a complete SKILL.md draft with structured metadata (name, description, trigger, tags, model pattern) and markdown instructions. The AI output uses a structured JSON format for reliable, consistent generation.

**Structured Editor** — A five-tab interface covering Metadata (name, description, trigger, tags, model pattern), Instructions (markdown editor), Files (attached scripts and reference documents), Preview (live SKILL.md rendering with validation summary), and History (versioned snapshots of every change).

**Multi-Model Testing** — Test any skill against models available through OpenRouter — Claude, GPT-4, Gemini, Llama, and hundreds of others — with streaming responses, token usage metrics, and latency tracking. Test history is persisted for comparison across runs.

**Auto-Save & Versioning** — Changes are automatically saved after a 3-second debounce. Every save creates a version snapshot with a timestamp, enabling full change history and rollback.

**Import & Export** — Bulk-import skills from zip files or scan agent directories (with tilde expansion and symlink support). Export individual skills or your entire library as zip archives.

**One-Click Deploy** — Deploy skills directly to the filesystem directory of your chosen agent. Supports eight targets: Antigravity, Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, and Windsurf. Skills follow the SKILL.md standard, making them portable across any agent that supports it.

**Settings & Security** — Manage your OpenRouter API key (encrypted with AES-256-GCM), select default models, toggle light/dark themes, and backup or restore your entire database.

## Target Users & Use Cases

uberSKILLS is built for developers and teams who rely on AI coding agents and want to systematize their workflows. Typical users include:

- **Individual developers** building a personal library of reusable skills — code review checklists, testing protocols, deployment procedures, or domain-specific coding standards — that they deploy across multiple agents.
- **Engineering teams** standardizing how AI agents behave across their organization, ensuring consistent code quality, security practices, and architectural patterns through shared skill libraries.
- **AI tool enthusiasts** experimenting with prompt engineering for coding agents, using the multi-model testing sandbox to compare how different models interpret the same skill instructions.
- **Open-source contributors** creating and sharing skills with the community, leveraging the import/export system and the portable SKILL.md format.

The common thread is anyone who has moved beyond ad-hoc prompting and wants a structured, version-controlled, testable approach to managing their agent skills.

## Development Progress

uberSKILLS is currently at **version 0.9.10**, in active development approaching a stable 1.0 release. The project launched with a full-featured foundation (v0.9.0) including the monorepo architecture, all core packages, the editor, AI-assisted creation, testing sandbox, and import/export/deploy pipeline. Subsequent releases have added multi-agent deploy targets (8 agents), a standalone landing page with SEO, a CLI entry point via npx, brand identity refinement, and ongoing reliability improvements such as structured JSON output for AI skill generation and URL-slug synchronization in the editor.

The tech stack is modern and production-grade: Next.js 15 with the App Router, React 19, TypeScript in strict mode, Tailwind CSS v4 with shadcn/ui components, SQLite via Drizzle ORM, Vercel AI SDK for streaming, and Turborepo for monorepo orchestration. Testing covers unit tests (Vitest) and end-to-end tests (Playwright). The codebase is linted and formatted with Biome.

## Business Model

uberSKILLS is **free and open-source** under the MIT license. There is no signup, no subscription, and no telemetry. The only cost is AI model usage through your own OpenRouter API key, which is required only for AI-assisted creation and multi-model testing — the visual editor, import/export, and deployment features work without it.

## Links

- **Website**: [uberskills.dev](https://uberskills.dev)
- **GitHub**: [github.com/uberskillsdev/uberskills](https://github.com/uberskillsdev/uberskills)
- **npm**: [@uberskillsdev/uberskills](https://www.npmjs.com/package/@uberskillsdev/uberskills)
- **Agent Skills Standard**: [agentskills.io](https://agentskills.io/)
- **Documentation**: [docs/](https://github.com/uberskillsdev/uberskills/tree/master/docs)
