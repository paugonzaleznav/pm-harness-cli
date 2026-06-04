# PM Harness CLI

**A browser-based CLI that structures the full product management workflow for teams building SaaS with AI code agents.**

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
/pmharness-copy export   ← full Markdown spec to clipboard
```

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Zero dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![Single file](https://img.shields.io/badge/install-drop%20in%20one%20file-blue)

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

Each layer reduces ambiguity. Each layer also injects context from all the layers above it — so by the time a task reaches your code agent, it carries the product vision, the tech stack, the Figma design specs, the user story, and the acceptance criteria.

---

## Install

**It's a single HTML file. There is nothing to install.**

```bash
# Option A: clone the repo
git clone https://github.com/paugonzaleznav/pm-harness-cli
open pm-harness-cli/index.html

# Option B: drop it into your project
cp index.html /your/project/pm-harness.html
open /your/project/pm-harness.html

# Option C: serve it locally
npx serve .
# or
python3 -m http.server 8080
```

Open in any modern browser (Chrome, Firefox, Safari, Edge). No npm, no build step, no server required.

> **API access:** PM Harness calls `api.anthropic.com` directly from the browser. When running inside Claude.ai, the API key is handled by the Claude.ai proxy automatically. When self-hosting, see [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md) for how to add your own key.

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

Verify everything with `/pmharness-ctx`.

### 2 — Connect Figma (optional, strongly recommended)

```
/pmharness-figma https://figma.com/file/ABC123/TaskFlow-UI
```

PM Harness extracts your component names, UI flows, color palette, and typography — then automatically injects this context into every subsequent generation step. Without Figma, your agent has to guess at visual details. With Figma, it generates code that matches your actual design system.

### 3 — Generate epics

```
/pmharness-epics          ← Claude generates 4-5 strategic epics from your context
/pmharness-epics list     ← review them
/pmharness-epic 2         ← select the one you want to work on
```

### 4 — Generate user stories

```
/pmharness-stories             ← Claude generates 3-4 stories for the active epic
/pmharness-story 1             ← see role, action, benefit, acceptance criteria, complexity
/pmharness-stories list        ← overview
```

### 5 — Generate use cases

```
/pmharness-usecases            ← Claude generates 3-4 use cases for the active epic
/pmharness-usecase 1           ← full detail: actor, main flow, alternative flows, postconditions
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
| Task | — (agent-only, not pushed) | — (agent-only, not pushed) |

### 7 — Generate agent tasks

```
/pmharness-tasks          ← Claude generates structured prompts optimized for code agents
/pmharness-task 1         ← read the full prompt (includes context, Figma specs, constraints, expected output)
```

### 8 — Hand off to your code agent

```bash
/pmharness-copy task 2    ← copies the prompt to clipboard

# Then in your terminal:
claude          # paste → Claude Code picks it up
# or
codex           # paste
# or
aider           # paste
# or Cursor / Copilot / any agent that accepts text input
```

### 9 — Export

```
/pmharness-copy tasks     ← all prompts as Markdown (for sprint planning docs)
/pmharness-copy export    ← full spec: vision + stories + tasks + Figma context
/pmharness-summary         ← summary view in terminal
```

---

## Command reference

| Command | Description |
|---|---|
| `/pmharness-init <name>` | Initialize a product session |
| `/pmharness-set vision <text>` | Product vision / problem statement |
| `/pmharness-set stack <tech>` | Tech stack (e.g. `Next.js + Supabase`) |
| `/pmharness-set users <text>` | Target user definition |
| `/pmharness-set sprint <text>` | Current sprint focus |
| `/pmharness-ctx` | Show all context fields |
| `/pmharness-import` | Import a spec document (.txt .md .pdf .docx) |
| `/pmharness-epics` | Generate epics with AI |
| `/pmharness-epics list` | List all epics |
| `/pmharness-epic <n>` | Select epic n |
| `/pmharness-stories` | Generate user stories for active epic |
| `/pmharness-stories list` | List all stories |
| `/pmharness-story <n>` | Full story detail + acceptance criteria |
| `/pmharness-usecases` | Generate use cases for active epic |
| `/pmharness-usecases list` | List all use cases |
| `/pmharness-usecase <n>` | Full use case detail |
| `/pmharness-prd` | Generate a PRD from all current context |
| `/pmharness-prd view` | Re-display the generated PRD |
| `/pmharness-tasks` | Generate code agent tasks |
| `/pmharness-tasks list` | List tasks with push status |
| `/pmharness-task <n>` | Full agent prompt for task n |
| `/pmharness-copy task <n>` | Copy task n prompt to clipboard |
| `/pmharness-copy tasks` | Copy all prompts as Markdown |
| `/pmharness-copy prd` | Copy the PRD as Markdown |
| `/pmharness-copy export` | Copy full spec as Markdown |
| `/pmharness-figma <url\|key>` | Connect Figma file |
| `/pmharness-config` | Open configuration (Agent · PM Tool · Figma) |
| `/pmharness-config agent` | Configure AI provider, model, API key |
| `/pmharness-config jira` | Configure Jira credentials |
| `/pmharness-config linear` | Configure Linear credentials |
| `/pmharness-push [jira\|linear]` | Push tasks to PM tool |
| `/pmharness-summary` | Spec summary in terminal |
| `/pmharness-status` | Integration and agent status |
| `/pmharness-help [filter]` | Show all commands (or filter by keyword) |
| `/pmharness-clear` | Clear terminal output |
| `/pmharness-reset` | Reset session |

**Keyboard shortcuts:**

| Key | Action |
|---|---|
| `Tab` | Autocomplete command |
| `↑` / `↓` | Navigate history / autocomplete |
| `Enter` | Execute |
| `Escape` | Close autocomplete |

Full reference: [docs/COMMANDS.md](./docs/COMMANDS.md)

---

## Integrations

| Integration | What it does | How to set up |
|---|---|---|
| **Figma** | Extracts design context (components, flows, colors, typography) and injects it into all AI prompts | `/pmharness-figma <url>` |
| **Jira** | Creates Epics, Stories (linked to Epic), and Sub-tasks (linked to Story) from your generated epics, stories, and use cases | `/pmharness-config jira` → `/pmharness-push jira` |
| **Linear** | Creates Projects/Milestones, Issues (linked to Epic), and Sub-issues (linked to Story) from your generated epics, stories, and use cases | `/pmharness-config linear` → `/pmharness-push linear` |

> Figma and PM tool integrations use the Anthropic MCP protocol and require an Anthropic model. They are unavailable when using OpenAI models.

Detailed setup guide: [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md)

---

## Configuration

Open the configuration modal with `/pmharness-config` (or the ⚙ gear icon). It has three tabs.

### Agent tab (`/pmharness-config agent`)

| Field | Description |
|---|---|
| **AI Provider** | `Anthropic` or `OpenAI` — switches which fields are shown below |
| **Anthropic API Key** | `sk-ant-…` — optional when running inside Claude.ai (proxy handles auth). Required for self-hosting. Stored in sessionStorage only. |
| **Anthropic Model** | Claude model to use (e.g. `claude-sonnet-4-20250514`) |
| **OpenAI API Key** | `sk-…` — always required for OpenAI. Stored in sessionStorage only. |
| **OpenAI Model** | `GPT-4o`, `GPT-4o Mini`, or `O3` |
| **Target Code Agent** | Which agent style to optimise task prompts for (Claude Code, Copilot, Codex, Cursor, etc.) |
| **Max tokens** | Token budget for standard calls. PRD generation uses 2.5× this value automatically. |

### PM Tool tab (`/pmharness-config jira` / `/pmharness-config linear`)

**Jira**

| Field | Description |
|---|---|
| Atlassian Domain | `your-company.atlassian.net` |
| Email | The account email associated with the API token |
| API Token | Generate at `id.atlassian.com → Security → API tokens` |
| Project Key | The prefix used in issue numbers (e.g. `MYAPP` in `MYAPP-42`) |

**Linear**

| Field | Description |
|---|---|
| Linear API Key | Generate at `Linear → Settings → API → Personal API keys` |
| Team ID | Found in `Settings → Team → General` in the URL (optional — defaults to your primary team) |

### Figma tab

| Field | Description |
|---|---|
| Figma Personal Access Token | `figd_…` — generate at `Figma → Settings → Security → Access tokens`. Authenticates the Figma MCP server for private files. |
| Figma File Key or URL | The full Figma file URL or just the file key (`ABC123` from `figma.com/file/ABC123/…`) |

> All credentials (API keys, tokens) are stored in `sessionStorage` — they are cleared automatically when the tab or browser is closed.

---

## AI providers

PM Harness supports both Anthropic and OpenAI models. Configure via `/pmharness-config agent`.

| Feature | Anthropic (Claude) | OpenAI (GPT-4o / O3) |
|---|---|---|
| Epics, stories, use cases, PRD, tasks | ✓ | ✓ |
| PDF document import | ✓ | — |
| Figma MCP integration | ✓ | — |
| Jira / Linear push | ✓ | — |
| API key required | Optional (Claude.ai proxy) | Required |

---

## Documentation

| Document | What it covers |
|---|---|
| [docs/COMMANDS.md](./docs/COMMANDS.md) | Every command with arguments, examples, errors |
| [docs/WORKFLOW.md](./docs/WORKFLOW.md) | PM methodology, when to use each step, how to write good inputs |
| [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md) | Figma, Jira, Linear setup; how MCP works; adding custom integrations |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Code structure, design decisions, how to extend |
| [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md) | Running outside Claude.ai with your own Anthropic API key |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

---

## Architecture

Single HTML file. Zero dependencies. Everything in the browser.

```
index.html (~2000 lines)
├── CSS          Design tokens, layout, terminal, dark mode (prefers-color-scheme)
├── HTML         Status panel + terminal + modal root
└── JavaScript
    ├── CMDS[]        Command registry (autocomplete source of truth)
    ├── S{}           Session state (in-memory, no persistence)
    ├── run()         Command dispatcher (string → handler)
    ├── claude()      AI client — routes to Anthropic or OpenAI
    ├── callAnthropic() Anthropic Messages API + MCP servers
    ├── callOpenAI()  OpenAI Chat Completions API
    ├── L()           Terminal DOM output helper
    └── handlers      cmdInit, cmdGenEpics, cmdGenStories, cmdGenTasks, cmdFigma, cmdPush...
```

**No persistence by design** — credentials and session data live only in memory. Use `/pmharness-copy export` or `/pmharness-push` to persist what matters.

Full architecture docs: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

High-value contributions:
- New PM tool integrations (GitHub Issues, Asana, Notion, Shortcut)
- Richer agent task prompt templates
- `/pmharness-story edit` and `/pmharness-task edit` commands for inline refinement
- Accessibility improvements
- i18n support

---

## License

MIT — see [LICENSE](./LICENSE).
