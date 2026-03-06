# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-03-06

### Added

- **Monorepo & Tooling**
  - Turborepo monorepo with Bun package manager
  - Biome for linting and formatting
  - Vitest for unit testing
  - Playwright for E2E testing
  - GitHub Actions CI/CD pipeline

- **Core Packages**
  - `@uberskills/types` -- shared TypeScript interfaces and enums
  - `@uberskills/db` -- Drizzle ORM schema, typed CRUD queries, SQLite/Turso support, AES-256-GCM API key encryption
  - `@uberskills/skill-engine` -- SKILL.md parser, validator, generator, argument substitution, importer, and exporter
  - `@uberskills/ui` -- shadcn/ui component library

- **Database**
  - SQLite schema with 5 tables: skills, skill_files, skill_versions, test_runs, settings
  - Database migrations and seed data
  - Database backup and restore functionality
  - OpenRouter model caching in DB with searchable selector

- **UI & Design**
  - Indigo Craft design system with light/dark mode support
  - Collapsible left sidebar with sections, external links, and skill count badge
  - Custom app icon in sidebar header
  - Dashboard home page
  - Shared page components (StatusBadge, SkillCard)

- **Settings**
  - Settings API route and page
  - API key management with encrypted storage
  - User preferences and data management

- **Skills Library**
  - Skills CRUD API routes
  - Skills library page with grid and list view toggle
  - Search, pagination, and sorting

- **Skill Editor**
  - Tabbed editor with vertical sidebar layout (Metadata, Instructions, Files, Preview, History)
  - Metadata form with validation
  - Markdown editor for instructions
  - File management tab
  - SKILL.md preview with generation and copy
  - Version history with content snapshots
  - Auto-save with debounce
  - Real-time validation feedback
  - Skill delete with confirmation dialog

- **AI-Assisted Creation**
  - AI chat API route with streaming via OpenRouter and Vercel AI SDK
  - AI skill creation page with chat panel and preview panel
  - Reusable model selector component

- **Skill Testing**
  - Skill test API route with streaming and metrics
  - Testing page with configuration panel
  - Response panel with formatted markdown rendering
  - Resolved system prompt dialog
  - Test history table

- **Import / Export / Deploy**
  - Skill exporter (zip file generation)
  - Skill importer (zip/directory parsing)
  - Export and deploy API routes
  - Export and deploy buttons in editor
  - Import page for uploading skills
  - One-click deploy to `~/.claude/skills/`

- **Logging**
  - Structured logging with Pino across all API routes
  - Configurable log level via `LOG_LEVEL` environment variable
  - Sensitive field redaction (API keys, authorization headers)

- **Deployment**
  - Multi-stage Dockerfile with Bun
  - Docker Compose service definition
  - Volume mount for data persistence

### Fixed

- Model passed to chat transport via ref to avoid stale closure
- Skill editor uses slug instead of ID in tab and test link URLs
- Run Test button disabled immediately on click to prevent double submissions
- Truncated skill descriptions in list view to prevent column overflow
- Active sidebar tab uses bold font instead of gray background
- Send button aligned with chat input field
- Sidebar separator placed inside content to fix overflow
- Consistent padding on instructions tab content
- Tab content max-width adjusted for balanced padding

[0.9.0]: https://github.com/uberskills/uberskills/releases/tag/v0.9.0
