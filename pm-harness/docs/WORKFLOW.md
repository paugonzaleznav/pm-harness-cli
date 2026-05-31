# PM Workflow Guide

This document explains the product management methodology behind PM Harness CLI — why each step exists, what the AI uses from your inputs, and how to write inputs that produce the best output at each stage.

---

## Why structured PM matters for code agents

AI code agents are powerful but context-sensitive. The quality of their output is almost entirely determined by the quality of their instructions.

Most teams jump straight from product idea to agent prompt:

> *"Build me a dashboard for my SaaS"*

The agent guesses at requirements, assumes a UI, and produces something technically functional but misaligned with what was needed. The team then spends more time correcting the output than they saved using the agent.

PM Harness enforces a structured decomposition layer:

```
Product context
    ↓
Strategic epics (what big chunks of value exist)
    ↓
User stories (who needs what, and why — with testable acceptance criteria)
    ↓
Structured agent tasks (with context, constraints, Figma specs, expected output)
    ↓
PM tool issues (Jira / Linear — for tracking and team visibility)
```

Each layer refines scope. Each layer also carries context from all layers above it — so by the time a prompt reaches your code agent, it contains everything the agent needs to produce correct, idiomatic, visually aligned output on the first pass.

---

## Layer 1: Product Context

**Commands:** `/init`, `/set vision|stack|users|sprint`, `/ctx`

The context layer is the foundation for all AI generation. It feeds directly into every Claude call in the pipeline.

### Product name (`/init`)

The product name anchors all output. Keep it short and memorable. Claude uses it in headings, summaries, and export docs.

### Vision (`/set vision`)

The single most influential input in the pipeline. Claude uses it to:
- Decide what kinds of epics make sense (auth, data pipeline, UI, integrations...)
- Calibrate the level of technical complexity
- Write user stories that solve the right problem

**Bad vision (too generic):**
> A project management tool

**Good vision (specific, user-aware, differentiating):**
> A SaaS that automatically extracts structured tasks from Slack message threads, eliminating manual copy-paste work for engineering managers at Series A startups who manage asynchronous remote teams

Rules of thumb:
- Name the specific user
- Name the specific pain (not just "efficiency")
- Name what makes your solution different from a generic PM tool

### Stack (`/set stack`)

Claude injects this into every agent task prompt. If you write `Next.js + Supabase`, the agent writes:
- `import { createClient } from '@supabase/supabase-js'` (not a generic database client)
- App Router patterns (not Pages Router)
- `server actions` where appropriate (not custom API routes for everything)

Be as specific as you would be if handing off to a new engineer:
```
/set stack Next.js 14 App Router + Supabase + Drizzle ORM + Tailwind + shadcn/ui
```

### Users (`/set users`)

Used in the "As a..." part of every user story. If you say `Engineering managers`, Claude writes:
> As an engineering manager, I want to...

If you have multiple user types, list the primary one here. You can add context in your vision statement.

### Sprint focus (`/set sprint`)

Optional, but valuable. Without it, Claude generates epics for the whole product. With it, Claude focuses on what's relevant right now:

```
/set sprint MVP — just the core extraction pipeline and the review queue UI
```

This prevents Claude from generating epics about analytics and admin settings when you're still building the MVP.

---

## Layer 2: Figma Context

**Command:** `/figma <url>`

This is the single biggest quality multiplier in the pipeline.

### What gets extracted

When you connect a Figma file, Claude (via the Figma MCP server) extracts:

- **Component names and descriptions** — `TaskCard`, `SidebarNav`, `ReviewQueue`, `FilterChip`
- **UI flows and screen names** — Onboarding, Review Queue, Task Detail, Settings
- **Color palette** — `#1D9E75` (primary teal), `#2C2C2A` (text), `#F1EFE8` (background)
- **Typography scale** — Inter 13/15/18/24px, Geist Mono for code
- **Design patterns** — Optimistic updates, card-based layout, inline editing

### How it affects downstream output

Without Figma, an agent task prompt reads:
> *Create the task review queue UI component*

With Figma connected, the same task reads:
> *Create the `ReviewQueue` component (see Figma file ABC123). It uses the existing `TaskCard` component for each item. Layout: vertical list, 16px gap. Card has: title (Inter 15px semibold), description (Inter 13px, `--text-2`), assignee avatar (32px circle, fallback initials), and a priority dot (teal=high, amber=med, gray=low). The approve button follows the `ActionButton` pattern — teal fill, 8px radius. Empty state uses the `EmptyIllustration` component with the message "No tasks to review".*

The agent can now write code that matches your actual design system without ever seeing the design file.

### When to connect

Connect Figma before running `/epics` to get the richest integration — design context flows through the entire pipeline. If you've already run `/epics`, connect Figma and re-run `/epics` to regenerate with design-aware output.

---

## Layer 3: Epics

**Commands:** `/epics`, `/epics list`, `/epic <n>`

Epics are the highest-level deliverables in your product. Each epic represents a coherent chunk of value that can be shipped independently and tested with users.

### What makes a good epic

PM Harness uses epics to scope story generation. An epic that's too broad produces generic stories. An epic that's too narrow doesn't need an epic.

Good epics are:
- Independently shippable (can be shipped without waiting for another epic)
- Meaningful to a user (they can do something with it)
- ~1–3 sprint weeks of work
- Describable in a single sentence

**Too broad:**
> Build the product

**Too narrow:**
> Fix the login button alignment

**Good:**
> Core task extraction engine — the AI pipeline that parses Slack threads into structured tasks, including webhook receiver, Claude integration, and Supabase persistence

### Working with generated epics

Claude's epics are a strong starting point. Before selecting one with `/epic <n>`, check:

1. Does the title clearly describe the deliverable?
2. Does the description match your actual technical plan?
3. Is the priority order right for your current sprint?

If the output doesn't match expectations, refine your inputs and re-run:
```
/set sprint MVP — focus only on extraction, not the full dashboard yet
/epics          ← regenerate
```

Each `/epics` call replaces the previous list.

### The active epic

Only one epic is active at a time. Selecting an epic with `/epic <n>` clears any existing stories and tasks — they were scoped to the previous epic. Use `/copy export` or `/push` to save work before switching.

---

## Layer 4: User Stories

**Commands:** `/stories`, `/stories list`, `/story <n>`

User stories define the atomic unit of product work: a single piece of user value in a form that can be estimated, built, and tested.

### Format

```
As a <role>, I want to <action> so that <benefit>
```

PM Harness adds:
- **Acceptance criteria** — specific, observable, testable conditions for "done"
- **Complexity** — S / M / L / XL (t-shirt sizing)

### What acceptance criteria are for

Acceptance criteria serve two purposes in PM Harness:

1. **For the team** — alignment on what "done" means before building starts
2. **For the agent** — Claude uses the acceptance criteria when generating task prompts, ensuring the agent knows what "passing" looks like

The better your acceptance criteria, the more testable and specific your agent task prompts become.

### Reviewing generated stories

Claude's stories are a starting point. Use `/story <n>` to read each one and ask:

- Is the acceptance criteria specific enough to write a test for?
- Is this story the right size (S/M/L/XL)?
- Does it make sense given what already exists in the codebase?

Stories cannot be edited in-CLI yet (see [CONTRIBUTING.md](../CONTRIBUTING.md)). Use the generated stories as context for discussion with your team before running `/tasks`.

### Story granularity

Stories should be implementable by one developer in 1–3 days. If a story is XL, consider:
1. Splitting it into two stories
2. Breaking the epic into two smaller epics and generating stories for each

---

## Layer 5: Agent Tasks

**Commands:** `/tasks`, `/tasks list`, `/task <n>`, `/copy task <n>`

Agent tasks are the output — what your code agent actually receives.

### What's in a task prompt

Each task prompt generated by PM Harness includes:

**1. Context**
> "This route is called by the Slack events webhook. It sits between the webhook receiver (already built in `/api/slack/events`) and the task review queue. The Supabase schema is at `db/schema.ts`."

**2. Figma design specs (if connected)**
> "The `TaskCard` component (Figma ABC123) shows: title (Inter 15px semibold), description (13px, --text-2 color), assignee avatar (32px circle), priority dot (teal/amber/gray). Follow this spec exactly."

**3. Concrete implementation steps**
> "1. Accept POST at `/api/slack/extract`. 2. Verify signature with SLACK_SIGNING_SECRET. 3. Call Anthropic API to extract tasks. 4. Save to Supabase `tasks` table..."

**4. Constraints**
> "⚠ Use the existing Supabase client from `lib/supabase.ts`. ⚠ Do not add new dependencies. ⚠ Handle Slack's 3-second response timeout."

**5. Expected output**
> "Working `/app/api/slack/extract/route.ts` that passes the existing test in `__tests__/slack-extract.test.ts`."

### Using with specific agents

**Claude Code**
```bash
claude
# In the session, paste the task prompt from /copy task <n>
```

**Aider**
```bash
aider --model claude-sonnet-4-20250514
# Paste the prompt when aider starts
```

**Codex**
```bash
codex
# Paste the prompt
```

**Cursor / Copilot / any agent**
Copy with `/copy task <n>` and paste into the agent's prompt input.

**For long sessions (multiple tasks):**
```bash
/copy tasks     ← all task prompts as one document
# Paste the full document at the start of a long agent session
# The agent can work through the tasks sequentially
```

### Context size and session planning

The `estimatedTokens` tag on each task indicates prompt length:

| Value | What it means | Agent session guidance |
|---|---|---|
| `low` | Short prompt | Can combine multiple tasks in one session |
| `medium` | Typical implementation task | One task per session, or 2–3 for simple tasks |
| `high` | Complex, many details | One task per session; consider splitting |

---

## Sprint ceremonies integration

### Sprint planning

1. Run the pipeline for each epic you're planning
2. Use `/tasks list` to see all tasks with complexity tags
3. Use `/push jira` or `/push linear` to populate the backlog
4. Use complexity + `estimatedTokens` to estimate session lengths

### Refinement sessions

1. Use `/story <n>` to walk through acceptance criteria with the team
2. Review task prompts with `/task <n>` before sprint starts
3. Flag tasks that need more context or split into smaller tasks

### During the sprint

Open PM Harness with the current epic context. Use `/tasks list` to track push status. Use `/task <n>` to re-read a prompt before an agent session.

### End of sprint

Use `/copy export` to generate a full spec Markdown document. This serves as:
- Sprint record (what was planned vs built)
- Onboarding context for new team members
- Input for retrospective ("did the agent prompts produce the right output?")

---

## Common patterns

### Parallel epic development

Run the pipeline for each epic before starting development:
```
# Epic 1
/epics → /epic 1 → /stories → /tasks → /push linear

# Epic 2
/epic 2 → /stories → /tasks → /push linear

# Epic 3
/epic 3 → /stories → /tasks → /push linear
```

Each epic's tasks are now in Linear. Developers pull tasks and paste prompts into their agents independently.

### Incremental context building

Start lean and add context as you learn:
```
/init ProductName
/set vision First draft of vision
/epics

# After team discussion:
/set vision More specific vision after talking to users
/set sprint Sprint 1 — just onboarding
/epics     ← regenerate with better context
```

### Figma-first workflow

If your design is ahead of your code:
```
/figma <url>            ← connect Figma first
/init + /set ...        ← fill in context
/epics                  ← epics generated with design awareness from the start
```

### Post-launch: new features

For existing products adding features, use the sprint field to scope:
```
/set vision Existing product + new feature context
/set sprint Q2 feature: CSV export and bulk operations
/epics      ← Claude generates epics for the new feature only
```
