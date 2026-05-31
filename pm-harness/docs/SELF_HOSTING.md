# Self-Hosting Guide

PM Harness CLI calls the Anthropic Messages API from the browser. When running inside **Claude.ai**, the API key is handled automatically by the Claude.ai proxy — no configuration needed.

When running **outside Claude.ai** (local dev, your own server, embedded in a product), you need to handle the API key yourself.

---

## Option A — Add your key directly to the HTML (local use only)

Open `index.html` and find the `claude()` function. Add an `Authorization` header:

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
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'sk-ant-YOUR_KEY_HERE',       // ← add this
      'anthropic-version': '2023-06-01',           // ← add this
    },
    body: JSON.stringify(body),
  });
  return r.json();
}
```

> ⚠️ **Only do this for local use.** Never commit an API key to a public repo or deploy a file containing your key to a public server.

**Get an API key:** [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key.

---

## Option B — Prompt for the key at startup (safe for sharing)

Add a key prompt to the `boot()` function that stores the key in `S` and uses it in the `claude()` function:

```javascript
// Add to the state object S:
const S = {
  // ...existing fields...
  apiKey: '',
};

// Modify the claude() function:
async function claude(system, user, mcps) {
  const body = { /* ... */ };
  if (mcps) body.mcp_servers = mcps;

  const headers = { 'Content-Type': 'application/json' };
  if (S.apiKey) {
    headers['x-api-key'] = S.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return r.json();
}

// Add a /key command:
{ c: '/key', a: '<api-key>', d: 'Set your Anthropic API key for this session' },

// In run():
if (c0 === '/key') {
  if (!rest) { fail('Usage: /key sk-ant-...'); return; }
  S.apiKey = rest;
  ok('API key set for this session ✓');
  dim('  Key is stored in memory only and cleared on refresh.');
  return;
}

// In boot() — prompt on load:
function boot() {
  sep();
  L('<strong>PM Harness CLI</strong>  ·  Code Agent Pipeline  ·  v2.0', 'l-info');
  // ...
  if (!S.apiKey) {
    warn('No API key set. Run: /key sk-ant-YOUR_KEY');
    dim('  Get a key at console.anthropic.com');
  }
  sep();
}
```

---

## Option C — Proxy server (production use)

For team deployments or any public-facing use, run a lightweight proxy that adds the API key server-side:

```javascript
// proxy.js (Node.js / Express)
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/messages', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.json(data);
});

app.use(express.static('.'));  // serve index.html
app.listen(3000);
```

Then update the `claude()` function in `index.html` to point to your proxy:

```javascript
const r = await fetch('/api/messages', {    // ← local proxy instead of Anthropic directly
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
```

Add authentication to the proxy (session cookies, auth header check, etc.) to prevent unauthorized use.

---

## CORS note

When calling `api.anthropic.com` directly from the browser (Options A and B), requests work when:
- Running inside Claude.ai (the proxy handles CORS)
- Running on `localhost` (Anthropic allows CORS from localhost for development)

For non-localhost deployments without a proxy, you will hit CORS errors. Use Option C (proxy server) for any deployed instance.

---

## Environment variables (Option C — proxy)

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

```bash
# Start the proxy
node proxy.js
# or
ANTHROPIC_API_KEY=sk-ant-... node proxy.js
```

---

## Docker (Option C — proxy)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "proxy.js"]
```

```yaml
# docker-compose.yml
services:
  pm-harness:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

```bash
docker compose up
open http://localhost:3000
```
