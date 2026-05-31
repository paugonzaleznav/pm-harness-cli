# Integrations Guide

PM Harness connects to three external services via the **Model Context Protocol (MCP)**. All integrations are optional — the core pipeline works without any of them.

| Integration | Purpose | MCP Endpoint |
|---|---|---|
| **Figma** | Extract UI design context and inject into prompts | `https://mcp.figma.com/mcp` |
| **Jira** | Push tasks as Story issues | `https://mcp.atlassian.com/mcp` |
| **Linear** | Push tasks as issues | `https://mcp.linear.app/mcp` |

---

## How MCP integrations work

PM Harness calls the Anthropic Messages API with an additional `mcp_servers` parameter:

```json
{
  "model": "claude-sonnet-4-20250514",
  "messages": [{ "role": "user", "content": "..." }],
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://mcp.figma.com/mcp",
      "name": "figma-mcp"
    }
  ]
}
```

Claude handles the MCP handshake transparently. The response may include `mcp_tool_use` and `mcp_tool_result` content blocks alongside the usual `text` blocks. PM Harness extracts data from both.

**Security:** Your credentials are stored only in browser memory (the `S` object) for the session. They are transmitted only within the MCP request to the respective service's MCP endpoint, via the Anthropic API proxy. They are never stored anywhere else and are lost on page refresh.

---

## Figma

### What it does

When you run `/figma <url>`, PM Harness asks Claude to use the Figma MCP server to analyze your design file and extract:

- **Component inventory** — names and descriptions of all components
- **UI flows** — screen names and navigation structure
- **Color palette** — hex values and semantic names
- **Typography** — font families, size scale, weight usage
- **Design patterns** — recurring UX conventions

This context is stored in `S.figmaCtx` and automatically injected into every subsequent AI generation call (`/epics`, `/stories`, `/tasks`).

### Why this matters

**Without Figma** — an agent task prompt says:
> "Build the task review queue component"

**With Figma** — the same task prompt says:
> "Build the `ReviewQueue` component (Figma file ABC123). Uses `TaskCard` for each item. `TaskCard` shows: title (Inter 15px semibold), description (13px `--text-2`), assignee avatar (32px), priority dot (teal/amber/gray). Empty state: `EmptyIllustration` with copy 'Nothing to review'. Approve button: `ActionButton` variant (teal fill, 8px radius). Follow the existing component API patterns in `/components/ui/`."

The agent can now generate code that matches your actual design system without accessing the design file directly.

### Setup

When running inside Claude.ai:
- No additional configuration needed
- Figma connection uses your existing Figma account linked to Claude.ai

When self-hosting (see [SELF_HOSTING.md](./SELF_HOSTING.md)):
- The Figma MCP server requires a Figma account authorized in your Claude workspace
- This is handled at the Claude platform level, not by PM Harness

### Usage

```
# Full URL (both formats)
/figma https://figma.com/file/ABC123/My-Design-File
/figma https://figma.com/design/ABC123/My-Design-File

# File key only
/figma ABC123
```

**Finding the file key:** In any Figma file URL, the key is the alphanumeric segment after `/file/` or `/design/`. For `https://figma.com/file/xK3pRv7nQw/My-Product`, the key is `xK3pRv7nQw`.

### Extracted JSON structure

```json
{
  "summary": "Task management dashboard with card-based inbox...",
  "components": ["TaskCard", "SidebarNav", "ReviewQueue", "FilterBar"],
  "flows": ["Onboarding", "Task Review", "Task Detail", "Settings"],
  "colors": ["#1D9E75 primary", "#2C2C2A text", "#F1EFE8 background"],
  "typography": "Inter 13/15/18/24px, Geist Mono for code",
  "patterns": ["Optimistic UI", "Inline editing", "Card-based layout"],
  "details": "Full extracted text for use in prompts..."
}
```

### Fallback behavior

If the Figma MCP server is unavailable:
1. PM Harness shows `⚠ Figma MCP unavailable`
2. The file key is registered in `S.figmaCtx` with a placeholder summary
3. Downstream prompts reference the file key but won't include design detail
4. You can reconnect Figma by running `/figma <url>` again

---

## Jira

### What it does

When you run `/push jira`, PM Harness creates one Story issue in your Jira project for each generated task.

**Each issue contains:**
- **Summary** — the task title
- **Description** — the full agent prompt (Markdown formatted)
- **Issue type** — Story
- **Priority** — mapped from `estimatedTokens` (high → Urgent, medium → Medium, low → Low)
- **Epic link** — the active epic title (applied as a label if epic links aren't configured)

### Setup — step by step

**Step 1: Generate an Atlassian API token**

1. Go to [id.atlassian.com](https://id.atlassian.com)
2. Click your profile → **Manage account**
3. Navigate to **Security** → **API tokens**
4. Click **Create API token**
5. Name it (e.g. `pm-harness`) and copy the token — it starts with `ATATT3x`
6. Save it somewhere safe — it will not be shown again

**Step 2: Find your project key**

Your project key is the prefix in every issue number. If your issues are numbered `TASK-1`, `TASK-2`, etc., your key is `TASK`.

To find it: Jira → your project → **Project settings** → **Details** → **Key**

**Step 3: Configure in PM Harness**

```
/config jira
```

Fill in the modal:
| Field | Example |
|---|---|
| Atlassian domain | `mycompany.atlassian.net` (no `https://`, no trailing slash) |
| Email | `you@company.com` (must match your Atlassian account) |
| API token | `ATATT3xFf...` |
| Project key | `TASK` (case-sensitive) |

**Step 4: Push**

```
/tasks          ← ensure tasks are generated
/push jira
```

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `⚠ MCP unavailable` | Domain or token incorrect | Check domain format (no https://) and regenerate token |
| Issues not appearing | Wrong project key | Keys are case-sensitive; check in Project settings |
| "Unauthorized" in Jira | Token expired or revoked | Generate a new token at id.atlassian.com |
| Issues in wrong project | Wrong project key | Update with `/config jira` |

---

## Linear

### What it does

When you run `/push linear`, PM Harness creates one issue in your Linear team for each generated task.

**Each issue contains:**
- **Title** — the task title
- **Description** — the full agent prompt (Markdown formatted)
- **Priority** — mapped from `estimatedTokens`
- **Team** — your configured team (or default team if not specified)

### Setup — step by step

**Step 1: Generate a Linear API key**

1. Open Linear → click your workspace name (bottom-left)
2. Go to **Settings** → **API** → **Personal API keys**
3. Click **Create key**
4. Name it (e.g. `pm-harness`) — the key starts with `lin_api_`
5. Copy it immediately — it won't be shown again

**Step 2: Find your Team ID (optional)**

If you have multiple Linear teams and want to target a specific one:

1. Linear → **Settings** → **Teams** → click your team
2. The Team ID is in the URL: `linear.app/settings/teams/TEAM_ID/general`

If you only have one team, you can leave the Team ID field blank.

**Step 3: Configure in PM Harness**

```
/config linear
```

Fill in the modal:
| Field | Example |
|---|---|
| API key | `lin_api_ABC123...` |
| Team ID | `TEAM_ABC` (optional) |

**Step 4: Push**

```
/tasks          ← ensure tasks are generated
/push linear
```

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `⚠ MCP unavailable` | API key incorrect | Verify key starts with `lin_api_`; regenerate if needed |
| Issues going to wrong team | Team ID not set | Add Team ID in `/config linear` |
| "Unauthorized" error | Key revoked | Generate a new key in Linear settings |

---

## Adding custom integrations

PM Harness uses a simple, consistent pattern for MCP integrations. Adding a new one (GitHub Issues, Asana, Notion, Shortcut, Azure DevOps) takes about 20 lines.

### Pattern

```javascript
// 1. Add a handler function
async function cmdPushMyTool() {
  if (!S.tasks.length) { fail('No tasks to push. Run /tasks first.'); return; }

  sep();
  warn(`Pushing ${S.tasks.length} tasks to MyTool...`);
  const ld = loader();

  try {
    await claude(
      'You are an assistant that creates issues in MyTool via MCP.',
      `Create one issue per task in MyTool:\n\n${
        S.tasks.map((t, i) => `${i+1}. ${t.title}\n${t.agentPrompt.slice(0, 150)}`).join('\n\n')
      }`,
      [{ type: 'url', url: 'https://mcp.mytool.com/mcp', name: 'mytool-mcp' }]
    );
  } catch { /* graceful fallback */ }

  rmLoader(ld);
  S.tasks.forEach(t => { S.pushed[t.id] = 'MyTool'; });
  S.pmTool = 'mytool';
  ok(`${S.tasks.length} tasks pushed to MyTool ✓`);
  sep();
  syncPanel();
}

// 2. Add to the command dispatcher (run() function)
if (c01 === '/push mytool') return cmdPushMyTool();
if (c01 === '/config mytool') return showModal('mytool');

// 3. Add modal body (in showModal() bodies object)
mytool: `
  <div class="field"><label>API Key</label><input id="mt-key" placeholder="..."></div>
  <div class="btn-row">
    <button class="btn btn-primary" onclick="S.mytool={apiKey:document.getElementById('mt-key').value};S.pmTool='mytool';closeModal();ok('MyTool configured ✓');syncPanel()">Save</button>
    <button class="btn" onclick="closeModal()">Cancel</button>
  </div>`,

// 4. Register commands for autocomplete (CMDS array)
{ c: '/config mytool', a: '', d: 'Configure MyTool credentials' },
{ c: '/push mytool',   a: '', d: 'Push tasks to MyTool' },
```

### Known MCP endpoints

| Service | MCP URL | Notes |
|---|---|---|
| Figma | `https://mcp.figma.com/mcp` | Already integrated |
| Jira (Atlassian) | `https://mcp.atlassian.com/mcp` | Already integrated |
| Linear | `https://mcp.linear.app/mcp` | Already integrated |
| GitHub | `https://mcp.github.com/mcp` | Issues, PRs, discussions |
| Asana | `https://mcp.asana.com/sse` | Tasks and projects |
| Google Drive | `https://drivemcp.googleapis.com/mcp/v1` | Docs, Sheets |

Contributions for additional integrations are welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).
