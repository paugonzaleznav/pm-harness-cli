# PM Harness CLI

**A browser-based CLI that structures the full product management workflow for teams building SaaS with AI code agents.**

Works with Claude Code, GitHub Copilot, Codex, Aider, Open Code, Cursor, and any other tool that accepts a text prompt.

```
/init TaskFlow
/set vision A SaaS that turns Slack threads into structured tasks automatically
/set stack Next.js + Supabase
/figma https://figma.com/file/ABC123/TaskFlow-UI
/epics
/epic 2
/stories
/tasks
/task 1        ← full structured prompt, ready for your code agent
/push linear   ← creates Linear issues from every task
/copy export   ← full Markdown spec to clipboard
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
  → Explicit product context     (/init, /set)
      → Strategic epics           (/epics)
          → User stories          (/stories)
              → Structured agent tasks (/tasks)
                  → Push to PM tool    (/push)
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
/init TaskFlow
/set vision A SaaS that turns Slack threads into structured tasks, eliminating manual tracking for engineering managers
/set stack Next.js + Supabase
/set users Engineering managers at Series A startups
/set sprint MVP — core extraction pipeline and review inbox
```

Verify everything with `/ctx`.

### 2 — Connect Figma (optional, strongly recommended)

```
/figma https://figma.com/file/ABC123/TaskFlow-UI
```

PM Harness extracts your component names, UI flows, color palette, and typography — then automatically injects this context into every subsequent generation step. Without Figma, your agent has to guess at visual details. With Figma, it generates code that matches your actual design system.

### 3 — Generate epics

```
/epics          ← Claude generates 4-5 strategic epics from your context
/epics list     ← review them
/epic 2         ← select the one you want to work on
```

### 4 — Generate user stories

```
/stories             ← Claude generates 3-4 stories for the active epic
/story 1             ← see role, action, benefit, acceptance criteria, complexity
/stories list        ← overview
```

### 5 — Generate agent tasks

```
/tasks          ← Claude generates structured prompts optimized for code agents
/task 1         ← read the full prompt (includes context, Figma specs, constraints, expected output)
```

### 6 — Use with your code agent

```bash
/copy task 2    ← copies the prompt to clipboard

# Then in your terminal:
claude          # paste → Claude Code picks it up
# or
codex           # paste
# or
aider           # paste
# or Cursor / Copilot / any agent that accepts text input
```

### 7 — Push to your PM tool

```
/config jira    ← one-time setup (domain, email, API token, project key)
/push jira      ← creates one Story per task in Jira

# or
/config linear  ← one-time setup (API key, team ID)
/push linear    ← creates one issue per task in Linear
```

### 8 — Export

```
/copy tasks     ← all prompts as Markdown (for sprint planning docs)
/copy export    ← full spec: vision + stories + tasks + Figma context
/export         ← summary view in terminal
```

---

## Command reference

| Command | Description |
|---|---|
| `/init <name>` | Initialize a product session |
| `/set vision <text>` | Product vision / problem statement |
| `/set stack <tech>` | Tech stack (e.g. `Next.js + Supabase`) |
| `/set users <text>` | Target user definition |
| `/set sprint <text>` | Current sprint focus |
| `/ctx` | Show all context fields |
| `/epics` | Generate epics with AI |
| `/epics list` | List all epics |
| `/epic <n>` | Select epic n |
| `/stories` | Generate user stories for active epic |
| `/stories list` | List all stories |
| `/story <n>` | Full story detail + acceptance criteria |
| `/tasks` | Generate code agent tasks |
| `/tasks list` | List tasks with push status |
| `/task <n>` | Full agent prompt for task n |
| `/copy task <n>` | Copy task n prompt to clipboard |
| `/copy tasks` | Copy all prompts as Markdown |
| `/copy export` | Copy full spec as Markdown |
| `/figma <url\|key>` | Connect Figma file |
| `/config jira` | Configure Jira credentials |
| `/config linear` | Configure Linear credentials |
| `/push [jira\|linear]` | Push tasks to PM tool |
| `/export` | Spec summary in terminal |
| `/status` | Integration status |
| `/help [filter]` | Show all commands (or filter by keyword) |
| `/clear` | Clear terminal output |
| `/reset` | Reset session |

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
| **Figma** | Extracts design context (components, flows, colors, typography) and injects it into all AI prompts | `/figma <url>` |
| **Jira** | Creates Story issues for each generated task | `/config jira` → `/push jira` |
| **Linear** | Creates issues for each generated task | `/config linear` → `/push linear` |

Detailed setup guide: [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md)

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
index.html (~800 lines)
├── CSS          Design tokens, layout, terminal, dark mode (prefers-color-scheme)
├── HTML         Status panel + terminal + modal root
└── JavaScript
    ├── CMDS[]   Command registry (autocomplete source of truth)
    ├── S{}      Session state (in-memory, no persistence)
    ├── run()    Command dispatcher (string → handler)
    ├── claude() Anthropic API client (fetch + optional MCP servers)
    ├── L()      Terminal DOM output helper
    └── handlers cmdInit, cmdGenEpics, cmdGenStories, cmdGenTasks, cmdFigma, cmdPush...
```

**No persistence by design** — credentials and session data live only in memory. Use `/copy export` or `/push` to persist what matters.

Full architecture docs: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

High-value contributions:
- New PM tool integrations (GitHub Issues, Asana, Notion, Shortcut)
- Richer agent task prompt templates
- `/story edit` and `/task edit` commands for inline refinement
- Accessibility improvements
- i18n support

---

## License

MIT — see [LICENSE](./LICENSE).
