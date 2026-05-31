# Contributing

Contributions are welcome. PM Harness CLI is a single HTML file with zero dependencies — it's easy to set up and easy to modify.

---

## Getting started

```bash
git clone https://github.com/YOUR_USERNAME/pm-harness-cli
cd pm-harness-cli
open index.html   # that's it — no install step
```

Make changes to `index.html`. Refresh the browser to see them.

---

## What to contribute

### High-value additions

- **New PM tool integrations** — GitHub Issues, Asana, Notion databases, Shortcut, Azure DevOps. See [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md#adding-custom-integrations) for the pattern.
- **`/story edit <n>` and `/task edit <n>`** — Allow inline editing of generated content without leaving the CLI
- **`/epic add <title>`** — Manually add an epic without AI generation
- **`/story add`** — Manually add a user story
- **Richer agent task templates** — Per-framework prompt templates (Next.js App Router, Django, Rails, etc.) that produce more idiomatic code
- **`/export jira-csv`** — Export spec as a CSV importable to Jira
- **Accessibility** — Keyboard navigation improvements, screen reader support for terminal output
- **i18n support** — Multi-language output for the terminal messages

### Good first issues

- Add a `/version` command that prints the current version
- Add a `/copy story <n>` command
- Improve the autocomplete to handle subcommand arguments (e.g. suggest epic numbers after `/epic `)
- Add a confirmation step before `/reset`
- Add more command aliases

---

## Code style

There is no linter or formatter. The conventions used in `index.html`:

**JavaScript**
- 2-space indent
- `const` and `let` only (no `var`)
- Arrow functions for one-liners, `function` declarations for named handlers
- Async/await for all API calls
- `S.` prefix for all state access
- Handler functions named `cmd*()` (e.g. `cmdGenEpics`, `cmdPush`)

**CSS**
- CSS custom properties for all colors and radii
- BEM-ish class names with hyphens (`.p-section`, `.t-bar`, `.l-ok`)
- All colors reference `--` variables — never hardcoded hex values in component styles
- Dark mode handled entirely in `@media (prefers-color-scheme: dark)` — never in JS

**HTML**
- Semantic where possible (though the terminal is necessarily `<div>`-based)
- All interactive elements have `:hover` states

---

## Adding a command — checklist

1. [ ] Add entry to `CMDS[]` array (for autocomplete and `/help`)
2. [ ] Write `cmdMyCommand()` handler function
3. [ ] Add `if/return` in `run()` in the right position (specific before generic)
4. [ ] If it needs a modal: add to `bodies` and `titles` in `showModal()`
5. [ ] If it modifies state that shows in the panel: call `syncPanel()` at the end
6. [ ] Add documentation to [docs/COMMANDS.md](./docs/COMMANDS.md)
7. [ ] Test: Tab autocomplete finds it, `/help mycommand` shows it, the command runs without errors

---

## Pull request guidelines

- Keep PRs focused — one feature or fix per PR
- Update [docs/COMMANDS.md](./docs/COMMANDS.md) for any new or changed commands
- Update [CHANGELOG.md](./CHANGELOG.md) under "Unreleased"
- Test in Chrome, Firefox, and Safari before submitting
- For integrations: test both the happy path and the MCP unavailable fallback

---

## Reporting bugs

Open an issue with:
- The command you ran
- The expected output
- The actual output (copy from the terminal)
- Browser and OS

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
