# Command Reference

Complete reference for every PM Harness CLI command: arguments, behavior, output examples, and error codes.

---

## Table of contents

- [Product Context](#product-context)
- [Epics](#epics)
- [User Stories](#user-stories)
- [Agent Tasks](#agent-tasks)
- [Copy & Export](#copy--export)
- [Integrations](#integrations)
- [Utilities](#utilities)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Error reference](#error-reference)

---

## Product Context

### `/init <name>`

Initialize a new product session with the given product name. Always the first command to run.

**Arguments**
| Argument | Required | Description |
|---|---|---|
| `<name>` | Yes | Product name. Can be multiple words. |

**Example**
```
/init TaskFlow
/init My SaaS Dashboard
```

**Side effects**
- Sets `S.name`
- Updates the status panel
- Prompts next step in terminal

**Errors**
- `✗ Usage: /init <product name>` — no name provided

---

### `/set vision <text>`

Set the product vision statement: what problem is being solved, for whom, and how.

**Arguments**
| Argument | Required | Description |
|---|---|---|
| `<text>` | Yes | Any text after the keyword `vision` |

**Example**
```
/set vision A SaaS that automatically extracts and structures tasks from Slack threads, reducing manual PM overhead for engineering managers at Series A startups
```

**Tips**
- Include the user, the problem, and the differentiator in one sentence
- This is the most influential input for AI generation quality — be specific

---

### `/set stack <tech>`

Set the technical stack. Injected verbatim into agent task prompts so the code agent writes idiomatic code.

**Examples**
```
/set stack Next.js + Supabase
/set stack Django + React + PostgreSQL
/set stack Rails 7 + Hotwire + Tailwind
/set stack FastAPI + Vue 3 + Postgres + Redis
/set stack Laravel 11 + Inertia + MySQL
```

---

### `/set users <text>`

Define the target user(s). Used in the "As a..." part of every user story.

**Examples**
```
/set users Engineering managers at Series A startups
/set users B2B SaaS product managers
/set users Freelance designers managing client projects
```

---

### `/set sprint <text>`

Set the current sprint focus. Narrows epic and story generation to what's relevant now.

**Examples**
```
/set sprint MVP — core task extraction and review inbox
/set sprint Sprint 4 — payment flow and subscription management
/set sprint Post-launch — analytics dashboard and CSV export
```

---

### `/ctx`   _(alias: `/context`)_

Display all current product context fields in a formatted summary.

**Example output**
```
 Current product context
  Name      TaskFlow
  Vision    A SaaS that turns Slack threads into structured tasks...
  Stack     Next.js + Supabase
  Users     Engineering managers at Series A startups
  Sprint    MVP — core extraction and review inbox
  Figma     ✓ Connected (ABC123) — Dashboard with card-based inbox...
  PM Tool   linear
```

**Notes**
- Does not call the AI. Reads from session state only.
- Use before running `/epics` to verify your context is complete.

---

## Epics

### `/epics`

Generate 4–5 strategic epics using Claude Sonnet, based on the current product context.

**Prerequisites**
- `/init` must have been run (`S.name` set)
- `/set vision` must have been run (`S.vision` set)

**Context injected into the AI call**
```
Product name + Vision + Stack + Users + Sprint focus
+ Figma design summary (if /figma has been run)
```

**Output format**
Each epic contains:
```json
{
  "id": 1,
  "title": "Core Task Extraction Engine",
  "description": "The AI pipeline that parses Slack threads into structured tasks",
  "priority": "high",
  "tags": ["nlp", "slack", "core"]
}
```

**Example terminal output**
```
✓ 5 epics generated for TaskFlow

 Epics  —  type /epic <n> to select one
  [1] User Authentication & Onboarding   HIGH
       End-to-end flow from signup to first task created
  [2] Core Task Extraction Engine        HIGH
       The AI layer that parses Slack threads into structured tasks
  [3] Review Inbox & Task Management     HIGH
       Main workspace for reviewing, editing, and assigning tasks
  [4] Integrations Hub                   MED
       Slack, Jira, Linear, GitHub connections
  [5] Analytics Dashboard                LOW
       Usage metrics, extraction quality scores, team activity
```

**Errors**
- `✗ Insufficient context. Run: /init <name>  and  /set vision <text>` — prerequisites not met
- `✗ Could not parse epics. Try again.` — Claude returned non-JSON (rare; retry usually fixes it)
- `✗ Network error: ...` — API call failed

---

### `/epics list`

List all currently generated epics with their priority and active-epic indicator.

**Example output**
```
 Epics
  [1] User Auth & Onboarding         HIGH
  [2] Core Task Extraction Engine    HIGH  ◀ active
  [3] Review Inbox & Task Management HIGH
```

**Notes**
- Does not call the AI. Reads from session state.

---

### `/epic <n>`

Select epic number `n` as the active epic. All subsequent `/stories` and `/tasks` calls are scoped to this epic.

**Arguments**
| Argument | Required | Description |
|---|---|---|
| `<n>` | Yes | Integer index from the `/epics list` output |

**Example**
```
/epic 2
```

**Side effects**
- Sets `S.selEpic`
- Clears `S.stories` and `S.tasks` (scoped to the previous epic)
- Updates status panel

**Errors**
- `✗ Invalid number. Use /epics list to see the list.` — out of range or not a number

---

## User Stories

### `/stories`

Generate 3–4 user stories for the active epic using Claude Sonnet.

**Prerequisites**
- An epic must be selected (`/epic <n>`)

**Context injected into the AI call**
```
Product name + Stack + Active epic title + Epic description
+ Figma UI context (if connected)
```

**Output format**
Each story contains:
```json
{
  "id": 1,
  "role": "PM",
  "action": "review and edit AI-extracted tasks before they are saved",
  "benefit": "I can ensure accuracy and add context before tasks reach the inbox",
  "acceptanceCriteria": [
    "Extracted tasks appear in a review queue before the inbox",
    "PM can edit title, description, and assignee inline",
    "PM can reject a task (removes it from the queue)",
    "Approved tasks appear in the main inbox",
    "Changes are saved without a full page reload"
  ],
  "complexity": "L"
}
```

**Complexity scale**
| Value | Meaning |
|---|---|
| S | Small — ~1 day |
| M | Medium — 2–3 days |
| L | Large — ~1 week |
| XL | Extra large — multiple weeks; consider splitting |

**Example terminal output**
```
✓ 4 user stories generated for "Core Task Extraction Engine"

 User Stories  —  type /story <n> for full detail
  [1] As a PM, I want to connect my Slack workspace          M
  [2] As a PM, I want to review and edit extracted tasks     L
  [3] As a PM, I want to see extraction confidence scores    S
  [4] As an admin, I want to configure extraction rules      M
```

---

### `/stories list`

List all stories for the active epic with complexity indicators. Does not call the AI.

---

### `/story <n>`

Show the full detail of story number `n`, including acceptance criteria.

**Arguments**
| Argument | Required | Description |
|---|---|---|
| `<n>` | Yes | Integer index from `/stories list` |

**Example output**
```
 Story #2
  As a PM
  I want to review and edit AI-extracted tasks before they are saved
  so that I can ensure accuracy and add context before tasks reach the inbox
  Complexity: L

  Acceptance criteria:
    ✓ Extracted tasks appear in a review queue before the inbox
    ✓ PM can edit title, description, and assignee inline
    ✓ PM can reject a task (removes it from the queue)
    ✓ Approved tasks appear in the main inbox
    ✓ Changes are saved without a full page reload
```

---

## Agent Tasks

### `/tasks`

Generate 3–4 code agent tasks from the active stories using Claude Sonnet.

**Prerequisites**
- Stories must exist (`/stories` must have been run)

**Context injected into the AI call**
```
Product name + Stack + Epic title
+ All user stories (role + action)
+ Figma design specs (if connected — includes component names, visual constraints, patterns)
```

**Output format**
Each task contains:
```json
{
  "id": 1,
  "title": "Build Slack OAuth connection flow",
  "agentPrompt": "Create a Next.js API route at /api/slack/oauth that...",
  "context": "This is the first step in connecting a workspace. It runs during onboarding.",
  "constraints": [
    "Use the existing Supabase client from lib/supabase.ts",
    "Do not add new npm dependencies — use existing @slack/web-api"
  ],
  "expectedOutput": "Working /app/api/slack/oauth/route.ts with redirect logic and Supabase token storage",
  "estimatedTokens": "medium"
}
```

**Context size tags**
| Value | Meaning |
|---|---|
| low | Short prompt — fast agent response |
| medium | Moderate prompt — typical implementation task |
| high | Long prompt — complex feature, may benefit from splitting |

**Example terminal output**
```
✓ 3 agent tasks generated (with Figma context)

 Agent Tasks  —  type /task <n> to see the full prompt
  [1] Build Slack OAuth connection flow       med ctx
  [2] Implement task extraction service       high ctx
  [3] Create task review queue UI             med ctx

  Next: /copy task <n>  ·  /copy tasks  ·  /push jira  ·  /push linear
```

---

### `/tasks list`

List all agent tasks with context size and push status. Does not call the AI.

**Example output**
```
 Agent Tasks
  [1] Build Slack OAuth connection flow     med ctx
  [2] Implement task extraction service     high ctx  ↑ Linear
  [3] Create task review queue UI           med ctx   ↑ Linear
```

---

### `/task <n>`

Show the full agent prompt for task `n`, with context, Figma specs (if connected), constraints, and expected output.

**Arguments**
| Argument | Required | Description |
|---|---|---|
| `<n>` | Yes | Integer index from `/tasks list` |

**Example output**
```
 Task #2: Implement task extraction service

  Context: Next.js API route invoked by the Slack events webhook
  Figma:   TaskCard component shows title (Inter 15px), assignee avatar, priority dot

  Agent Prompt:
  ┌─────────────────────────────────────────────────────────────┐
  │ Create a Next.js API route at /api/slack/extract that:      │
  │                                                             │
  │ 1. Accepts POST requests from Slack Events API (verify      │
  │    the request signature using SLACK_SIGNING_SECRET)        │
  │ 2. Receives message.channels events from configured channels│
  │ 3. Uses the Anthropic SDK to extract structured tasks from  │
  │    the thread text — each task has: title, description,     │
  │    suggestedAssignee (string|null), priority                │
  │ 4. Saves tasks to Supabase `tasks` table                    │
  │ 5. Returns { success: true, tasksExtracted: n }             │
  │                                       [📋 copy]             │
  └─────────────────────────────────────────────────────────────┘

  Constraints:
  ⚠ Use existing Supabase client from lib/supabase.ts
  ⚠ Handle Slack's 3-second response timeout with a background pattern

  Expected output: /app/api/slack/extract/route.ts passing existing tests
  → /copy task 2  to copy this prompt to the clipboard
```

---

## Copy & Export

### `/copy task <n>`

Copy the agent prompt for task `n` directly to the clipboard.

**Example**
```
/copy task 2
✓ Task #2 copied to clipboard ✓
```

---

### `/copy tasks`

Copy all agent task prompts as a single Markdown document, separated by `---`.

**Output format**
```markdown
# Task 1: Build Slack OAuth connection flow

<full prompt text>

---

# Task 2: Implement task extraction service

<full prompt text>
```

**Example**
```
/copy tasks
✓ All 3 task prompts copied as Markdown ✓
```

---

### `/copy export`

Copy the complete product specification as Markdown. Use this as:
- A `SPEC.md` committed to the repo
- Context for a long-running agent session
- Input for a Notion or Confluence page
- Handoff documentation

**Output format**
```markdown
# TaskFlow — PM Spec for Code Agent

## Vision

...

## Tech Stack

...

## Figma Design Context

...

## Epic: Core Task Extraction Engine

...

## User Stories

- As a PM, I want to...

## Agent Tasks

### Task 1: Build Slack OAuth connection flow

```
<full prompt>
```
```

---

## Integrations

### `/figma <url|filekey>`

Connect a Figma file and extract design context via the Figma MCP server.

**Arguments**
| Argument | Required | Description |
|---|---|---|
| `<url>` | No* | Full Figma URL |
| `<filekey>` | No* | Bare file key (alphanumeric segment after `/file/` or `/design/` in the URL) |

*If called with no argument, opens the configuration modal.

**Accepted formats**
```
/figma https://figma.com/file/ABC123/TaskFlow-UI
/figma https://figma.com/design/ABC123/TaskFlow-UI
/figma ABC123
/figma              ← opens modal
```

**Side effects**
- Sets `S.figmaCtx` and `S.figmaKey`
- Updates integration status dot in panel
- Context is automatically injected into all subsequent `/epics`, `/stories`, `/tasks` calls

**Fallback behavior**
If the Figma MCP server is unreachable, the file key is registered manually and a warning is shown. Downstream prompts will reference the file key but won't include extracted design detail.

---

### `/config jira`

Opens the Jira configuration modal.

**Fields**
| Field | Example | Where to find it |
|---|---|---|
| Atlassian domain | `myco.atlassian.net` | Your Jira URL (no `https://`) |
| Email | `you@co.com` | Your Atlassian account email |
| API token | `ATATT3x...` | id.atlassian.com → Security → API tokens |
| Project key | `TASK` | The prefix in issue numbers (e.g. TASK-42) |

**Side effects on Save:** Sets `S.jira`, sets `S.pmTool = 'jira'`, updates panel.

---

### `/config linear`

Opens the Linear configuration modal.

**Fields**
| Field | Example | Where to find it |
|---|---|---|
| API key | `lin_api_...` | Linear → Settings → API → Personal API keys |
| Team ID | `TEAM_123` | Linear → Settings → Team → General (optional) |

**Side effects on Save:** Sets `S.linear`, sets `S.pmTool = 'linear'`, updates panel.

---

### `/push [jira|linear]`

Push all generated tasks to the configured PM tool as issues/stories.

**Variants**
```
/push              ← uses whichever tool is configured in S.pmTool
/push jira         ← always targets Jira
/push linear       ← always targets Linear
```

**Prerequisites**
- Tasks must exist (`/tasks` run)
- Target tool must be configured (`/config jira` or `/config linear`)

**What gets created**
- One issue per task
- Title = task title
- Description = agent prompt (truncated to 150 chars for the PM tool summary)
- Priority mapped from `estimatedTokens`: high → Urgent, medium → Medium, low → Low

**After push**
- Tasks in `/tasks list` show `↑ Jira` or `↑ Linear` badge
- `S.pushed` records which tool each task was pushed to

**Errors**
- `✗ No PM tool configured.` — run `/config jira` or `/config linear` first
- `✗ No tasks to push. Run /tasks first.` — generate tasks before pushing
- `⚠ MCP unavailable` — PM tool MCP server unreachable; tasks marked as pushed in UI anyway

---

## Utilities

### `/export`

Display a formatted summary of the full spec in the terminal — without making any API calls.

**Use case:** Review before copying or pushing. Also useful for async updates ("where are we?").

---

### `/status`

Show the connection status of all integrations.

**Example output**
```
 Integration status
  Figma     ✓ ABC123
  Jira      ✓ myco.atlassian.net
  Linear    not configured  —  /config linear
  Active PM jira
  Pushed    3 tasks
```

---

### `/help [filter]`

Show all commands grouped by category. Optionally filter by keyword.

**Examples**
```
/help              ← all commands grouped
/help copy         ← commands containing "copy"
/help push         ← /push, /push jira, /push linear
/help stories      ← /stories, /stories list, /story
/help figma        ← /figma command and description
```

---

### `/clear`

Clear all terminal output. Session state is fully preserved (all epics, stories, tasks, context, integration config remain).

---

### `/reset`

Completely reset the session. Clears all state and terminal output. Use when starting a new product or sprint from scratch.

**Note:** This clears integration credentials from memory. You will need to run `/config jira` or `/config linear` again after a reset.

---

## Keyboard shortcuts

| Key | Context | Action |
|---|---|---|
| `Tab` | While typing a `/` command | Autocomplete to first match |
| `↑` | Autocomplete open | Previous suggestion |
| `↑` | Autocomplete closed | Previous command in history |
| `↓` | Autocomplete open | Next suggestion |
| `↓` | Autocomplete closed | Next command in history |
| `Enter` | Any | Execute the current command |
| `Escape` | Autocomplete open | Close autocomplete |

---

## Error reference

| Error | Cause | Fix |
|---|---|---|
| `✗ Usage: /init <product name>` | `/init` called with no argument | Provide a name: `/init MyProduct` |
| `✗ Value required...` | `/set` called with empty value | Add a value after the field name |
| `✗ Insufficient context` | `/epics` without name + vision | Run `/init` and `/set vision` |
| `✗ No active epic` | `/stories` without selecting an epic | Run `/epic <n>` |
| `✗ No stories yet` | `/tasks` without stories | Run `/stories` |
| `✗ Invalid number` | Index out of range | Check with `list` variant of the command |
| `✗ No PM tool configured` | `/push` without configuration | Run `/config jira` or `/config linear` |
| `✗ No tasks to push` | `/push` without tasks | Run `/tasks` |
| `✗ Could not parse...` | Claude returned malformed JSON | Retry — this is non-deterministic and usually resolves |
| `✗ Network error` | `fetch()` to Anthropic API failed | Check internet connection; retry |
| `⚠ Figma MCP unavailable` | Figma MCP server unreachable | File key registered manually; reconnect Figma in settings |
| `⚠ MCP unavailable` | Jira/Linear MCP server unreachable | Tasks marked as pushed in UI; verify credentials in `/config` |
