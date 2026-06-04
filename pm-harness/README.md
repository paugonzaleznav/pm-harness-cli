# PM Harness CLI

**A CLI that structures the full product management workflow for teams building SaaS with AI code agents.**

Works with Claude Code, GitHub Copilot, Codex, Aider, Open Code, Cursor, and any other tool that accepts a text prompt.

```
/pmharness-init TaskFlow
/pmharness-set vision A SaaS that turns Slack threads into structured tasks automatically
/pmharness-set stack Next.js + Supabase
/pmharness-figma https://figma.com/file/ABC123/TaskFlow-UI
/pmharness-epics
/pmharness-epic 2
/pmharness-stories
/pmharness-usecases
/pmharness-push linear   ← pushes epics, stories & use cases to Linear
/pmharness-tasks
/pmharness-task 1        ← full structured prompt, ready for your code agent
```

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Zero dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)

---

## The problem

AI code agents produce great code when they receive precise, well-scoped instructions. Most teams skip the PM layer — they go straight from idea to agent prompt — and end up with technically functional but misaligned output, followed by expensive correction cycles.

PM Harness enforces a lightweight but rigorous discipline:

```
Vague idea
  → Explicit product context        (/pmharness-init, /pmharness-set)
      → Strategic epics              (/pmharness-epics)   ─┐
          → User stories             (/pmharness-stories)  ├─ push to Jira / Linear
              → Use cases            (/pmharness-usecases) ─┘
                  → Structured agent tasks (/pmharness-tasks) → code agent
```

Each layer reduces ambiguity and carries all the context from the layers above — so by the time a task reaches your code agent, it includes the product vision, tech stack, Figma design specs, user stories, and acceptance criteria.

---

## Install

### CLI mode (recommended)

Runs entirely in the terminal — no browser required. Requires Node.js 18+.

```bash
git clone https://github.com/paugonzaleznav/pm-harness-cli
cd pm-harness-cli
node cli.js
```

Or install globally:

```bash
npm install -g .
pmharness
```

You get an interactive terminal session:

```
▸ /pmharness-init TaskFlow
▸ /pmharness-set vision A SaaS that turns Slack threads into structured tasks
▸ /pmharness-epics
  ── Epics ──────────────────────────────────────
  [1]  Authentication & User Management  [HIGH]
  [2]  Task Extraction Pipeline          [HIGH]
  ...
▸ /pmharness-export task 1   ← copies prompt to clipboard, paste into any agent
```

Markdown files auto-save to `pm-specs/` after every generation step:

```
pm-harness-cli/
└── pm-specs/
    ├── epics.md
    ├── stories.md
    ├── usecases.md
    ├── prd.md
    └── tasks.md
```

**API key:** set the `ANTHROPIC_API_KEY` environment variable, or enter it once via `/pmharness-config agent`. Non-sensitive settings persist to `~/.pmharness.json`.

### Browser mode

Use the single HTML file when running inside Claude.ai or a hosted environment.

```bash
open pm-harness/index.html
# or serve it:
node server.js   # → http://localhost:3000
```

In browser mode, use `/pmharness-setdir` to pick a project folder for auto-save (Chrome / Edge only).

### API key

PM Harness calls the AI provider directly from the browser.

- **Anthropic:** API key is optional when running inside Claude.ai — the proxy handles auth automatically. For self-hosting, enter your key in `/pmharness-config agent`.
- **OpenAI:** API key is always required. Enter it in `/pmharness-config agent`.

All credentials are stored in `sessionStorage` only — cleared when the tab closes.

---

## Full workflow

### 1 — Define your product

```
/pmharness-init TaskFlow
/pmharness-set vision A SaaS that turns Slack threads into structured tasks, eliminating manual tracking for engineering managers
/pmharness-set stack Next.js + Supabase
/pmharness-set users Engineering managers at Series A startups
/pmharness-set sprint MVP — core extraction pipeline and review inbox
```

Verify everything with `/pmharness-ctx`. You can also import an existing spec with `/pmharness-import`.

### 2 — Connect Figma (optional, strongly recommended)

```
/pmharness-figma https://figma.com/file/ABC123/TaskFlow-UI
```

PM Harness extracts component names, UI flows, color palette, and typography — then injects this context into every subsequent generation step. Without Figma, your agent has to guess at visual details. With Figma, it generates code that matches your actual design system.

> Figma requires Anthropic mode. See [AI providers](#ai-providers).

### 3 — Generate epics

```
/pmharness-epics          ← AI generates 4-5 strategic epics from your context
/pmharness-epics list     ← review them
/pmharness-epic 2         ← select the one you want to work on
```

### 4 — Generate user stories

```
/pmharness-stories             ← AI generates 3-4 stories for the active epic
/pmharness-story 1             ← role, action, benefit, acceptance criteria, complexity
/pmharness-stories list        ← overview
```

### 5 — Generate use cases

```
/pmharness-usecases            ← AI generates 3-4 use cases for the active epic
/pmharness-usecase 1           ← actor, main flow, alternative flows, postconditions
/pmharness-usecases list       ← overview
```

### 6 — Push to your PM tool

```
/pmharness-config jira    ← one-time setup (domain, email, API token, project key)
/pmharness-push jira      ← pushes epics → stories → use cases to Jira

# or

/pmharness-config linear  ← one-time setup (API key, team ID)
/pmharness-push linear    ← pushes epics → stories → use cases to Linear
```

Push creates the full hierarchy in one command:

| PM Harness | Jira | Linear |
|---|---|---|
| Epic | Epic issue | Project / Milestone |
| Story | Story issue (linked to Epic) | Issue (linked to Epic) |
| Use case | Sub-task (linked to Story) | Sub-issue (linked to Story) |
| Task | — agent-only, not pushed | — agent-only, not pushed |

Tasks are the structured prompts for your code agent — they are never pushed to a PM tool.

> Jira and Linear require Anthropic mode. See [AI providers](#ai-providers).

### 7 — Generate agent tasks

```
/pmharness-tasks          ← AI generates structured prompts optimised for code agents
/pmharness-task 1         ← full prompt: context, Figma specs, constraints, expected output
/pmharness-tasks list     ← overview
```

### 8 — Hand off to your code agent

```bash
/pmharness-export task 2    ← copies the prompt to clipboard

# Then in your terminal:
claude    # paste → Claude Code picks it up
codex     # paste
aider     # paste
# or Cursor / Copilot / any agent that accepts text input
```

### 9 — Export

```
/pmharness-export tasks     ← all task prompts as Markdown to clipboard
/pmharness-export all    ← full spec (vision + stories + tasks + Figma) to clipboard
/pmharness-export prd       ← PRD as Markdown to clipboard
/pmharness-summary        ← spec summary in terminal
```

**CLI mode** (`node server.js`): epics, stories, use cases, PRD, and tasks auto-save to `pm-specs/` after each generation step.

**Browser mode**: use `/pmharness-setdir` once per session to pick a folder (Chrome / Edge only).

---

## Command reference

### Product context

| Command | Description |
|---|---|
| `/pmharness-init <name>` | Start a new product session |
| `/pmharness-set vision <text>` | Product vision / problem statement |
| `/pmharness-set stack <tech>` | Tech stack (e.g. `Next.js + Supabase`) |
| `/pmharness-set users <text>` | Target user definition |
| `/pmharness-set sprint <text>` | Current sprint focus |
| `/pmharness-ctx` | Show all context fields |
| `/pmharness-import` | Import a spec document (`.txt` `.md` `.pdf`) |

### Generation

| Command | Description |
|---|---|
| `/pmharness-epics` | Generate 4–5 strategic epics |
| `/pmharness-epics list` | List all epics with push status |
| `/pmharness-epic <n>` | Select epic n as active |
| `/pmharness-stories` | Generate 3–4 user stories for the active epic |
| `/pmharness-stories list` | List all stories with push status |
| `/pmharness-story <n>` | Full story detail + acceptance criteria |
| `/pmharness-usecases` | Generate 3–4 use cases for the active epic |
| `/pmharness-usecases list` | List all use cases with push status |
| `/pmharness-usecase <n>` | Full use case detail |
| `/pmharness-prd` | Generate a PRD from all current context |
| `/pmharness-prd view` | Re-display the generated PRD |
| `/pmharness-tasks` | Generate structured code agent tasks |
| `/pmharness-tasks list` | List all tasks |
| `/pmharness-task <n>` | Full agent prompt for task n |

### Copy & export

| Command | Description |
|---|---|
| `/pmharness-export task <n>` | Copy task n prompt to clipboard |
| `/pmharness-export tasks` | Copy all task prompts as Markdown |
| `/pmharness-export prd` | Copy the PRD as Markdown |
| `/pmharness-export all` | Copy full spec as Markdown |
| `/pmharness-summary` | Spec summary in terminal |

### Integrations & configuration

| Command | Description |
|---|---|
| `/pmharness-figma <url\|key>` | Connect a Figma file |
| `/pmharness-config` | Open configuration (Agent · PM Tool · Figma) |
| `/pmharness-config agent` | Configure AI provider, model, API key |
| `/pmharness-config jira` | Configure Jira credentials |
| `/pmharness-config linear` | Configure Linear credentials |
| `/pmharness-push jira` | Push epics, stories, use cases to Jira |
| `/pmharness-push linear` | Push epics, stories, use cases to Linear |
| `/pmharness-setdir` | Pick a project folder for auto-save (browser mode only) |

### Utilities

| Command | Description |
|---|---|
| `/pmharness-status` | Show status of all integrations and file export |
| `/pmharness-help [filter]` | List all commands, or filter by keyword |
| `/pmharness-clear` | Clear terminal output (state is preserved) |
| `/pmharness-reset` | Reset the entire session |

**Keyboard shortcuts:**

| Key | Action |
|---|---|
| `Tab` | Autocomplete command |
| `↑` / `↓` | Navigate history / autocomplete |
| `Enter` | Execute |
| `Escape` | Close autocomplete |

---

## Integrations

| Integration | What it does | Requires |
|---|---|---|
| **Figma** | Extracts design context (components, flows, colors, typography) and injects it into all AI prompts | Anthropic model |
| **Jira** | Creates Epics → Stories → Sub-tasks from your epics, stories, and use cases | Anthropic model |
| **Linear** | Creates Projects/Milestones → Issues → Sub-issues from your epics, stories, and use cases | Anthropic model |

> Figma, Jira, and Linear use the Anthropic MCP protocol. They are unavailable when using OpenAI models.

---

## Configuration

Open the configuration modal with `/pmharness-config` or the ⚙ gear icon. Three tabs:

### Agent tab

| Field | Description |
|---|---|
| **AI Provider** | `Anthropic` or `OpenAI` |
| **Anthropic API Key** | `sk-ant-…` — optional in Claude.ai (proxy handles auth). Required for self-hosting. |
| **Anthropic Model** | Claude model (e.g. `claude-sonnet-4-20250514`) |
| **OpenAI API Key** | `sk-…` — always required |
| **OpenAI Model** | `GPT-4o`, `GPT-4o Mini`, or `O3` |
| **Target Code Agent** | Optimises task prompt style for Claude Code, Copilot, Codex, Cursor, Aider, etc. |
| **Max tokens** | Token budget for standard calls — PRD uses 2.5× automatically |

### PM Tool tab

**Jira:** Atlassian domain · email · API token (from `id.atlassian.com → Security → API tokens`) · project key

**Linear:** API key (from `Linear → Settings → API`) · team ID (optional)

### Figma tab

Personal access token (`figd_…` from `Figma → Settings → Security → Access tokens`) · file key or URL

> All credentials are stored in `sessionStorage` only — cleared when the tab closes.

---

## AI providers

| Feature | Anthropic (Claude) | OpenAI (GPT-4o / O3) |
|---|---|---|
| Epics, stories, use cases, PRD, tasks | ✓ | ✓ |
| PDF document import | ✓ | — |
| Figma MCP integration | ✓ | — |
| Jira / Linear push | ✓ | — |
| API key required | Optional (Claude.ai proxy) | Always required |

---

## Architecture

```
pm-harness-cli/
├── cli.js             Terminal CLI — full app in Node.js, no browser needed
├── server.js          Browser server — serves index.html + POST /api/save for file writes
├── package.json       npm start → cli.js  |  npm run browser → server.js
├── pm-specs/          Auto-created on first run (CLI mode)
└── pm-harness/
    └── index.html     Browser app (~2200 lines, zero frontend dependencies)
```

**`cli.js`** — Node.js 18+, zero npm dependencies. Uses:
- `readline` for the interactive REPL and Tab autocomplete
- `fetch` (native Node 18) for Anthropic / OpenAI API calls
- `fs` for writing `pm-specs/` files
- `child_process` for clipboard (`pbcopy` / `xclip` / `clip`)
- `~/.pmharness.json` for non-sensitive config persistence

**`index.html`** — same commands and prompts as `cli.js`, rendered in a browser terminal UI.

**Session state** lives in memory only — page refresh clears it. In CLI mode, generated content is persisted automatically to `pm-specs/`. In browser mode, use `/pmharness-export all` or `/pmharness-push` before closing the tab.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

High-value contributions:
- New PM tool integrations (GitHub Issues, Asana, Notion, Shortcut)
- Richer agent task prompt templates
- `/pmharness-story edit` and `/pmharness-task edit` for inline refinement
- Accessibility improvements
- i18n support

---

## License

MIT — see [LICENSE](./LICENSE).
