# Changelog

All notable changes to PM Harness CLI will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

---

## [2.0.0] — 2025-05-31

### Added
- Full CLI-only workflow — every PM step is now a `/command`
- Command autocomplete with Tab completion and ↑↓ navigation
- Command history (↑↓ when autocomplete is closed)
- `/figma <url|key>` — Figma MCP integration for design context extraction
- `/config jira` + `/push jira` — Jira integration via Atlassian MCP
- `/config linear` + `/push linear` — Linear integration via Linear MCP
- `/copy task <n>` — copy single task prompt to clipboard
- `/copy tasks` — copy all task prompts as Markdown
- `/copy export` — copy full spec as Markdown
- `/stories list`, `/story <n>` — story detail with acceptance criteria
- `/tasks list`, `/task <n>` — task detail with full agent prompt
- `/epics list` — list all epics with active indicator
- `/status` — integration status summary
- `/export` — full spec summary in terminal
- `/help [filter]` — searchable command reference
- `/clear` — clear terminal without losing session state
- Dark mode support via `prefers-color-scheme`
- Status panel with live pipeline counters and integration dots
- Push status badges on `/tasks list` after `/push`
- Graceful fallback for all MCP integrations when server is unavailable

### Changed
- Replaced form-based UI with full terminal CLI
- All AI generation now uses structured JSON output with explicit system prompts
- Figma context is now automatically injected into all downstream generation calls

### Removed
- GUI panels (replaced by CLI + status sidebar)
- Phase-based navigation (replaced by free-form command workflow)

---

## [1.0.0] — 2025-05-01

### Added
- Initial release
- Form-based 5-phase PM pipeline: context → epics → stories → tasks → export
- Claude Sonnet integration for all AI generation steps
- Figma MCP integration (in modal form)
- Jira and Linear push (in modal form)
- Copy to clipboard for individual tasks and full export
- Dark mode
