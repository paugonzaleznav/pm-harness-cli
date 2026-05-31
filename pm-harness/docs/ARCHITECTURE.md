# Architecture

Technical overview of how PM Harness CLI is structured, and the rationale behind every major design decision.

---

## Overview

PM Harness CLI is a **single self-contained HTML file**. No build step, no package manager, no server, no external dependencies. It runs entirely in the browser.

```
pm-harness/
└── index.html    The entire application. ~800 lines of HTML + CSS + JS.
```

Three concerns, all in one file:

1. **Terminal UI** — renders output, handles input, autocomplete, history
2. **Command router** — maps typed strings to handler functions
3. **AI client** — calls the Anthropic Messages API (with optional MCP servers for integrations)

---

## File structure

```
index.html
├── <head>
│   └── <style>          All CSS: design tokens, layout, terminal, dark mode, modals
│
├── <body>
│   ├── .app             Root flex container
│   │   ├── .panel       Status sidebar (read-only, synced via syncPanel())
│   │   └── .terminal    Terminal wrapper
│   │       ├── .t-out   Scrollable output area (lines appended by L())
│   │       └── .t-bar   Input row + autocomplete anchor (#ac-mount)
│   └── #modal-root      Modal overlay mount point (innerHTML-based)
│
└── <script>
    ├── CMDS[]           Command registry
    ├── S{}              Application state
    ├── DOM refs         $out, $inp, $acMount, $modal
    ├── Terminal helpers L(), ok(), fail(), warn(), dim(), info(), teal(), hdr(), echo()
    ├── syncPanel()      Syncs all status panel fields from state
    ├── claude()         Anthropic API client
    ├── getText()        Extract text blocks from API response
    ├── getMcp()         Extract MCP tool result blocks from API response
    ├── parseJ()         JSON parser with markdown fence stripping
    ├── run()            Central command dispatcher
    ├── cmd*()           Individual command handlers
    ├── showModal()      Render a modal into #modal-root
    ├── closeModal()     Clear #modal-root
    ├── updateAC()       Render autocomplete dropdown
    ├── hideAC()         Clear autocomplete
    ├── Keyboard handler $inp keydown listener
    └── boot()           Initial terminal welcome output
```

---

## State model

All application state lives in a single plain JavaScript object `S`. There is no framework, no reactivity, no store.

```javascript
const S = {
  // Product context — set by /init and /set commands
  name:    '',   // string
  vision:  '',   // string
  stack:   '',   // string
  users:   '',   // string
  sprint:  '',   // string

  // AI-generated pipeline data
  epics:    [],  // [{ id, title, description, priority, tags[] }]
  selEpic:  null,// number | null — id of the active epic
  stories:  [],  // [{ id, role, action, benefit, acceptanceCriteria[], complexity }]
  tasks:    [],  // [{ id, title, agentPrompt, context, constraints[], expectedOutput, estimatedTokens }]

  // Integration state
  figmaCtx: null,// { summary, components[], flows[], colors[], patterns[], details } | null
  figmaKey: '',  // string — Figma file key
  pmTool:   null,// 'jira' | 'linear' | null
  jira:     { domain: '', email: '', token: '', project: '' },
  linear:   { apiKey: '', teamId: '' },
  pushed:   {},  // { [taskId: number]: 'Jira' | 'Linear' }

  // CLI state
  hist:    [],   // string[] — command history, newest first
  histIdx: -1,   // number — current history navigation position
  acItems: [],   // Command[] — current autocomplete matches
  acIdx:   -1,   // number — current autocomplete selection
};
```

**No persistence.** State exists only for the lifetime of the browser tab. This is intentional — see [Design Decisions](#design-decisions).

**Mutations.** State is mutated directly by command handlers (`S.epics = parsed`, `S.pmTool = 'jira'`). After any mutation that affects the panel, `syncPanel()` is called explicitly. There is no reactive binding.

---

## Terminal rendering

The terminal is a `<div class="t-out" id="out">` that accumulates `<div class="line ...">` child elements. New lines are always appended (never replaced).

### The `L()` function

```javascript
function L(html, cls = 'l-info') {
  const d = document.createElement('div');
  d.className = 'line ' + cls;
  d.innerHTML = html;
  $out.appendChild(d);
  $out.scrollTop = $out.scrollHeight;  // auto-scroll
  return d;                            // return node for later removal (e.g. loaders)
}
```

Convenience wrappers:

```javascript
const ok   = (t) => L('✓  ' + t, 'l-ok');    // green  — success
const fail = (t) => L('✗  ' + t, 'l-err');   // red    — errors
const warn = (t) => L('⚠  ' + t, 'l-warn');  // amber  — warnings
const dim  = (t) => L(t, 'l-dim');            // gray   — hints, secondary info
const info = (t) => L(t, 'l-info');           // white  — normal content
const teal = (t) => L(t, 'l-teal');           // teal   — group headings
const hdr  = (t) => L(t, 'l-hdr');            // border — section headers
const echo = (t) => L(t, 'l-cmd');            // teal + ▸ prefix — echoed commands
const sep  = ()  => L('', 'l-sep');           // 7px spacer
```

### Loading indicators

The `loader()` function creates an animated three-dot indicator:

```javascript
function loader() {
  return L('<span class="dots">...</span>  Processing with Claude Sonnet...', 'l-dim');
}
```

It returns the DOM node so the calling handler can remove it when the async operation finishes:

```javascript
const ld = loader();
const data = await claude(...);
rmLoader(ld);        // removes the dots line
ok('4 epics generated');
```

### Prompt boxes

Agent prompts render in a styled box with an inline copy button:

```javascript
function promptBox(text, id) {
  const node = document.createElement('div');
  node.className = 'line prompt-box';
  const safe = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  node.innerHTML = safe + `<button class="copy-btn" id="cb-${id}" onclick="clipCopy(...)">📋 copy</button>`;
  $out.appendChild(node);
  return node;
}
```

Agent prompt text is HTML-escaped before rendering to prevent XSS.

---

## Command router

`run(raw)` is the single entry point for all commands. It:

1. Trims and echoes the input
2. Pushes to command history
3. Computes match tokens: `c0` (first word), `c01` (first two words), `rest` (everything after the first word)
4. Matches against a sequential `if/return` chain

```javascript
async function run(raw) {
  const parts = raw.trim().split(/\s+/);
  const c0  = parts[0].toLowerCase();
  const c01 = (parts[0] + ' ' + (parts[1] || '')).toLowerCase();
  const rest = parts.slice(1).join(' ');

  if (c01 === '/epics list') return cmdEpicsList();
  if (c0 === '/epics')       return cmdGenEpics();   // must come AFTER /epics list
  if (c0 === '/epic')        return cmdSelectEpic(rest);
  // ...
}
```

**Order matters.** More specific patterns (`/epics list`) must appear before their prefix (`/epics`) because `/epics list` also starts with `/epics`. The current order in `index.html` is correct — do not reorder without testing every affected command.

---

## Anthropic API client

```javascript
async function claude(system, user, mcps) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system,
    messages: [{ role: 'user', content: user }],
  };
  if (mcps) body.mcp_servers = mcps;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}
```

**Model:** `claude-sonnet-4-20250514`. Fast and capable for all current generation tasks.

**max_tokens: 1000.** Sufficient for all current use cases (epic lists, story arrays, task arrays). Increase if you add features requiring longer output (e.g. generating full test suites or complete component files).

**MCP servers:** Passed as `[{ type: 'url', url, name }]`. The Anthropic API handles the MCP protocol — no additional client code needed.

### Response parsing

Standard text responses:
```javascript
function getText(data) {
  return (data?.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}
```

MCP tool results (Figma, Jira, Linear):
```javascript
function getMcp(data) {
  const res = (data?.content || []).filter(b => b.type === 'mcp_tool_result');
  return res.length
    ? res.map(b => b.content?.[0]?.text || '').join('\n')
    : getText(data);  // fallback to text if no MCP result blocks
}
```

JSON parsing (all AI generation calls return JSON):
```javascript
function parseJ(raw) {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return null;  // null triggers "Could not parse" error in the handler
  }
}
```

---

## Autocomplete

The autocomplete matches against the `CMDS` array — the single source of truth for all available commands. It also powers `/help`.

```javascript
function updateAC(val) {
  if (!val.startsWith('/')) { $acMount.innerHTML = ''; S.acItems = []; return; }

  const matches = CMDS.filter(c =>
    c.c.toLowerCase().startsWith(val.toLowerCase())
  );

  S.acItems = matches.slice(0, 9);
  $acMount.innerHTML = '<div class="ac-box">' + S.acItems.map((c, i) => `
    <div class="ac-item ${i === S.acIdx ? 'active' : ''}"
      onclick="$inp.value='${c.c} '; $inp.focus(); updateAC('${c.c} ')">
      <span class="ac-cmd">${c.c} ${c.a}</span>
      <span class="ac-desc">${c.d}</span>
    </div>`).join('') + '</div>';
}
```

The dropdown is positioned `bottom: 100%` on `#ac-mount` (inside `.t-bar`), so it appears above the input bar.

Keyboard navigation (`↑`, `↓`, `Tab`, `Escape`) shares the `keydown` listener with command history. The logic branches: if autocomplete is open, `↑`/`↓` navigate the dropdown; if closed, they navigate history.

---

## Modal system

Modals use a `position: fixed` overlay in `#modal-root`:

```javascript
function showModal(type) {
  $modal.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        ...body content...
      </div>
    </div>`;
}

function closeModal() { $modal.innerHTML = ''; }
```

Click-outside-to-close is implemented with `onclick="if(event.target===this)closeModal()"` on the overlay — fires only when the click target is the overlay itself, not the modal.

---

## CSS architecture

All styles are in a single `<style>` block using CSS custom properties for theming. Dark mode is handled entirely via `@media (prefers-color-scheme: dark)` — no JavaScript needed.

```css
:root {
  --teal: #1D9E75;
  --bg: #ffffff;
  --text-1: #1a1a18;
  /* ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #191918;
    --text-1: #e6e4dc;
    /* ... */
  }
}
```

All components use CSS variables exclusively. Adding or changing a theme requires only editing the `:root` block.

---

## Design decisions

### Single HTML file

**Decision:** The entire application is one `index.html`.

**Rationale:**
- Zero setup — download and open. No npm, no build, no server.
- Trivially embeddable — copy one file into any project.
- Fully auditable — all code is visible in one place.
- No dependency drift — nothing to update or break over time.

**Trade-off:** Harder to maintain at large scale. Mitigated by the file being well-structured and heavily commented. If the file ever exceeds ~1500 lines, splitting into HTML + JS + CSS with a simple `<script src>` is worth considering.

### No persistence

**Decision:** All state lives in memory only. Page refresh clears everything.

**Rationale:**
- Credentials (Jira tokens, Linear API keys) should not persist anywhere — not localStorage, not cookies.
- Forces explicit export (`/copy export`) or push (`/push`) before leaving — encourages clean handoffs.
- No risk of stale context from a previous session contaminating a new one.

**Trade-off:** Session is lost on refresh. Use `/copy export` or `/push` before closing the tab.

### No dependencies

**Decision:** No npm packages, no CDN scripts, no external CSS files.

**Rationale:**
- No supply chain risk.
- No version drift.
- No network requirement beyond the API calls.
- The full codebase is inspectable and auditable.

**Trade-off:** Some things are reinvented inline (autocomplete dropdown, modal system). These are small enough to maintain without a library.

### MCP for integrations

**Decision:** Use the Anthropic MCP server protocol for Figma, Jira, and Linear rather than writing direct REST API clients.

**Rationale:**
- Claude handles the MCP protocol — no custom API wrappers to write or maintain.
- MCP servers handle authentication transparently.
- Adding a new integration is ~20 lines: one function, one `if` in the router, one entry in `CMDS[]`.

**Trade-off:** Requires MCP servers to be available. Graceful fallbacks are implemented for all three.

### Sequential `if/return` dispatcher

**Decision:** The command router is a flat chain of `if (c0 === '/...') return handler()` rather than a dispatch table or class-based command objects.

**Rationale:**
- Trivially readable — no abstractions to understand.
- Order-dependent matching is explicit and visible.
- Adding a new command is one line in the right position.

**Trade-off:** Slightly verbose at 30 commands; a dispatch table would be more elegant at 60+. At the current scale, the flat chain is clearer.

---

## Adding a new command

### Step 1: Register in `CMDS[]`

```javascript
{ c: '/mycommand', a: '<arg>', d: 'Description shown in /help and autocomplete' },
```

### Step 2: Write the handler

```javascript
function cmdMyCommand(arg) {
  // Validate prerequisites
  if (!S.name) { fail('Run /init first.'); return; }

  sep();
  hdr('My command output');
  info('  Here is some info: ' + arg);
  dim('  A hint about what to do next');
  sep();
}
```

For async handlers that call the AI:

```javascript
async function cmdMyGenerate() {
  if (!S.name) { fail('Run /init first.'); return; }

  sep();
  const ld = loader();
  try {
    const data = await claude(
      'System prompt.',
      `User message with context: ${S.name}...`
    );
    rmLoader(ld);

    const parsed = parseJ(getText(data));
    if (!parsed) { fail('Could not parse response.'); return; }

    S.myResults = parsed;
    ok(`${parsed.length} results generated`);
    // render...
  } catch (ex) {
    rmLoader(ld);
    fail('Network error: ' + ex.message);
  }
  sep();
  syncPanel();
}
```

### Step 3: Add to the router

In `run()`, add the `if/return` in the appropriate position (more specific before less specific):

```javascript
if (c01 === '/my command subcommand') return cmdMySubcommand();
if (c0 === '/mycommand') return cmdMyCommand(rest);
```

### Step 4: (optional) Add a modal

In `showModal()`, add a key to the `bodies` object and `titles` object:

```javascript
const bodies = {
  // ...existing entries...
  mytool: `
    <div class="field"><label>API Key</label><input id="mt-k" placeholder="..."></div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="S.mytool={key:document.getElementById('mt-k').value};closeModal();ok('Configured ✓')">Save</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`,
};
const titles = {
  // ...existing entries...
  mytool: 'Configure MyTool',
};
```

---

## Security notes

**API calls:** All fetch calls go to `api.anthropic.com`. No other first-party server receives data.

**Credentials:** Jira tokens and Linear API keys exist only in `S.jira.token` and `S.linear.apiKey` in memory. They are transmitted to `api.anthropic.com` as part of MCP request prompts, and from there to the respective MCP endpoint. They are never sent anywhere else, never logged, and never stored.

**innerHTML:** The terminal uses `innerHTML` for rich text rendering (bold, colors, tags). User-provided text (product name, vision, etc.) flows through Claude before being displayed — it is never inserted directly as HTML. Agent prompts in `.prompt-box` elements are explicitly HTML-escaped:

```javascript
const safe = text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
```

**Credentials in modals:** Modal save handlers use direct `document.getElementById().value` reads — credentials are never placed in event handler attribute strings that could be logged.
