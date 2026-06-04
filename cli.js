#!/usr/bin/env node
'use strict';

const readline   = require('readline');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');

// ── ANSI ──────────────────────────────────────────────────────────
const A = {
  reset:'\x1b[0m', bold:'\x1b[1m', dim:'\x1b[2m',
  teal:'\x1b[36m', green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m',
};
const col = (a, s) => a + s + A.reset;

// ── Constants ─────────────────────────────────────────────────────
const CFG_FILE  = path.join(os.homedir(), '.pmharness.json');
const SPECS_DIR = path.join(process.cwd(), 'pm-specs');

// ── Config (persisted) ────────────────────────────────────────────
let cfg = { provider:'anthropic', model:'claude-sonnet-4-20250514', targetAgent:'generic', maxTokens:1000 };

function loadCfg() {
  try { if (fs.existsSync(CFG_FILE)) Object.assign(cfg, JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))); } catch {}
  if (process.env.ANTHROPIC_API_KEY) cfg.apiKey    = process.env.ANTHROPIC_API_KEY;
  if (process.env.OPENAI_API_KEY)    cfg.openaiKey = process.env.OPENAI_API_KEY;
}

function saveCfg() {
  const out = { provider:cfg.provider, model:cfg.model, targetAgent:cfg.targetAgent, maxTokens:cfg.maxTokens };
  if (S.jira.domain)   out.jiraDomain   = S.jira.domain;
  if (S.jira.email)    out.jiraEmail    = S.jira.email;
  if (S.jira.project)  out.jiraProject  = S.jira.project;
  if (S.linear.teamId) out.linearTeamId = S.linear.teamId;
  if (S.figmaKey)      out.figmaKey     = S.figmaKey;
  if (S.pmTool)        out.pmTool       = S.pmTool;
  try { fs.writeFileSync(CFG_FILE, JSON.stringify(out, null, 2)); } catch {}
}

// ── Session state ─────────────────────────────────────────────────
const S = {
  name:'', vision:'', stack:'', users:'', sprint:'',
  epics:[], selEpic:null, stories:[], usecases:[], prd:null, tasks:[],
  figmaCtx:null, figmaKey:'', figmaToken:'',
  pmTool:null, jira:{domain:'',email:'',token:'',project:''}, linear:{apiKey:'',teamId:''},
  pushed:{},
};

// ── Output helpers ────────────────────────────────────────────────
const ok   = s => console.log(col(A.green,  '✓  ' + s));
const fail = s => console.log(col(A.red,    '✗  ' + s));
const warn = s => console.log(col(A.yellow, '⚠  ' + s));
const dim  = s => console.log(col(A.dim,    s));
const info = s => console.log(s);
const teal = s => console.log(col(A.teal,   s));
const sep  = () => console.log('');
const hdr  = s  => console.log(col(A.bold, `\n── ${s} ${'─'.repeat(Math.max(0, 50 - s.length))}`));
const clip = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
const priTag  = p => p === 'high' ? col(A.red,'[HIGH]') : p === 'medium' ? col(A.yellow,'[MED]') : col(A.dim,'[LOW]');
const sizeTag = s => col(A.dim, `[${s}]`);

// ── Spinner ───────────────────────────────────────────────────────
function spinner(msg) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  process.stdout.write(A.dim);
  const id = setInterval(() => process.stdout.write(`\r${frames[i++ % frames.length]}  ${msg}`), 80);
  return { stop: () => { clearInterval(id); process.stdout.write(`\r\x1b[K${A.reset}`); } };
}

// ── API ───────────────────────────────────────────────────────────
async function claude(system, user, mcps, maxTokens, extraContent = null) {
  return cfg.provider === 'openai'
    ? callOpenAI(system, user, maxTokens)
    : callAnthropic(system, user, mcps, maxTokens, extraContent);
}

async function callAnthropic(system, user, mcps, maxTokens, extraContent) {
  const tokens = maxTokens ?? cfg.maxTokens ?? 1000;
  const userContent = extraContent ? [...extraContent, { type:'text', text:user }] : user;
  const body = { model:cfg.model||'claude-sonnet-4-20250514', max_tokens:tokens, system, messages:[{ role:'user', content:userContent }] };
  if (mcps) body.mcp_servers = mcps;
  const headers = { 'Content-Type':'application/json' };
  if (cfg.apiKey) { headers['x-api-key'] = cfg.apiKey; headers['anthropic-version'] = '2023-06-01'; headers['anthropic-dangerous-direct-browser-access'] = 'true'; }
  const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers, body:JSON.stringify(body) });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function callOpenAI(system, user, maxTokens) {
  if (!cfg.openaiKey) throw new Error('OpenAI API key not set — run /pmharness-config agent');
  const tokens = maxTokens ?? cfg.maxTokens ?? 1000;
  const isO = /^o\d/.test(cfg.model);
  const messages = isO ? [{ role:'user', content:system+'\n\n'+user }] : [{ role:'system', content:system },{ role:'user', content:user }];
  const body = { model:cfg.model, messages };
  if (isO) body.max_completion_tokens = tokens; else body.max_tokens = tokens;
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+cfg.openaiKey }, body:JSON.stringify(body) });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  return { content:[{ type:'text', text:data.choices?.[0]?.message?.content||'' }] };
}

const getText = data => (data?.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
const parseJ  = raw  => { try { return JSON.parse(raw.replace(/```json|```/g,'').trim()); } catch { return null; } };

// ── File save ─────────────────────────────────────────────────────
function saveMarkdown(filename, content) {
  try {
    fs.mkdirSync(SPECS_DIR, { recursive:true });
    fs.writeFileSync(path.join(SPECS_DIR, filename), content, 'utf8');
    dim(`  Saved → pm-specs/${filename}`);
  } catch (e) { warn('Could not save ' + filename + ': ' + e.message); }
}

// ── Markdown builders ─────────────────────────────────────────────
function mdEpics() {
  const lines = [`# Epics — ${S.name}\n`];
  S.epics.forEach((e,i) => { lines.push(`## ${i+1}. ${e.title}  [${e.priority.toUpperCase()}]`, e.description, ''); });
  return lines.join('\n');
}
function mdStories() {
  const epic = S.epics.find(e=>e.id===S.selEpic);
  const lines = [`# User Stories — ${epic?.title||S.name}\n`];
  S.stories.forEach((s,i) => {
    lines.push(`## Story ${i+1}  [${s.complexity}]`,`**As a** ${s.role}`,`**I want** ${s.action}`,`**so that** ${s.benefit}`);
    if (s.acceptanceCriteria?.length) { lines.push('\n**Acceptance criteria:**'); s.acceptanceCriteria.forEach(a=>lines.push('- '+a)); }
    lines.push('');
  });
  return lines.join('\n');
}
function mdUseCases() {
  const epic = S.epics.find(e=>e.id===S.selEpic);
  const lines = [`# Use Cases — ${epic?.title||S.name}\n`];
  S.usecases.forEach((u,i) => {
    lines.push(`## ${i+1}. ${u.title}`, `**Actor:** ${u.actor}`);
    if (u.preconditions?.length)  { lines.push('\n**Preconditions:**');  u.preconditions.forEach(p=>lines.push('- '+p)); }
    if (u.mainFlow?.length)       { lines.push('\n**Main flow:**');      u.mainFlow.forEach((s,j)=>lines.push(`${j+1}. ${s}`)); }
    if (u.postconditions?.length) { lines.push('\n**Postconditions:**'); u.postconditions.forEach(p=>lines.push('- '+p)); }
    lines.push('');
  });
  return lines.join('\n');
}
function mdTasks() {
  const epic = S.epics.find(e=>e.id===S.selEpic);
  const lines = [`# Agent Tasks — ${epic?.title||S.name}\n`];
  S.tasks.forEach((t,i) => {
    lines.push(`## Task ${i+1}: ${t.title}  [${t.estimatedTokens}]`, `\n\`\`\`\n${t.agentPrompt}\n\`\`\``);
    if (t.context)          lines.push(`\n**Context:** ${t.context}`);
    if (t.constraints?.length) { lines.push('\n**Constraints:**'); t.constraints.forEach(c=>lines.push('- '+c)); }
    if (t.expectedOutput)   lines.push(`\n**Expected output:** ${t.expectedOutput}`);
    lines.push('');
  });
  return lines.join('\n');
}
function mdPrd() {
  if (!S.prd) return '';
  const p = S.prd;
  const lines = [`# ${p.title}`,`**Version:** ${p.version||'1.0'}  |  **Product:** ${S.name}`,'','## Overview',p.overview,'','## Problem Statement',p.problemStatement];
  if (p.goals?.length)                   { lines.push('','## Goals');                    p.goals.forEach(g=>lines.push('- '+g)); }
  if (p.successMetrics?.length)          { lines.push('','## Success Metrics');          p.successMetrics.forEach(m=>lines.push('- '+m)); }
  if (p.personas?.length)                { lines.push('','## Personas');                 p.personas.forEach(pe=>lines.push(`**${pe.name}:** ${pe.description}`)); }
  if (p.features?.length)                { lines.push('','## Features'); p.features.forEach(f=>{ lines.push(`### ${f.title} [${(f.priority||'medium').toUpperCase()}]`,f.description); (f.requirements||[]).forEach(r=>lines.push('- '+r)); lines.push(''); }); }
  if (p.outOfScope?.length)              { lines.push('## Out of Scope');                p.outOfScope.forEach(o=>lines.push('- '+o)); }
  if (p.technicalConsiderations?.length) { lines.push('','## Technical Considerations'); p.technicalConsiderations.forEach(t=>lines.push('- '+t)); }
  if (p.risks?.length)                   { lines.push('','## Risks');                    p.risks.forEach(r=>lines.push(`**${r.risk}:** ${r.mitigation}`)); }
  if (p.openQuestions?.length)           { lines.push('','## Open Questions');           p.openQuestions.forEach(q=>lines.push('- '+q)); }
  return lines.join('\n');
}


// ── readline prompt helper ────────────────────────────────────────
function ask(question, def='') {
  const hint = def ? ` [${def}]` : '';
  return new Promise(resolve => rl.question(`  ${question}${hint}: `, a => resolve(a.trim()||def)));
}

// ── Command handlers ──────────────────────────────────────────────
function cmdInit(name) {
  if (!name) { fail('Usage: /pmharness-init <name>'); return; }
  Object.assign(S, { name, epics:[], selEpic:null, stories:[], usecases:[], prd:null, tasks:[] });
  sep(); ok(`Product initialized: ${col(A.bold, name)}`);
  dim('  Next: /pmharness-set vision <text>'); sep();
}

function cmdSet(field, value) {
  if (!value) { fail(`Usage: /pmharness-set ${field} <text>`); return; }
  S[field] = value;
  ok(`${field} set: ${clip(value, 72)}`);
}

function cmdCtx() {
  const epic = S.epics.find(e=>e.id===S.selEpic);
  hdr('Product Context');
  [['Product',S.name],['Vision',clip(S.vision,64)],['Stack',S.stack],['Users',clip(S.users,64)],
   ['Sprint',clip(S.sprint,64)],['Figma',S.figmaCtx?'✓ '+S.figmaKey:'—'],
   ['Active epic',epic?.title||'—'],['Stories',S.stories.length],['Use cases',S.usecases.length],['Tasks',S.tasks.length]
  ].forEach(([k,v]) => info(`  ${col(A.dim, k.padEnd(14))}  ${v||'—'}`));
  sep();
}

async function cmdGenEpics() {
  if (!S.name||!S.vision) { fail('Run /pmharness-init and /pmharness-set vision first.'); return; }
  sep(); const sp = spinner('Generating epics...');
  try {
    const data = await claude(
      'You are an expert SaaS product manager. Respond ONLY with pure JSON — no markdown, no backticks.',
      `Product: ${S.name}\nVision: ${S.vision}\nStack: ${S.stack}\nUsers: ${S.users}\nSprint: ${S.sprint}${S.figmaCtx?'\nFigma: '+S.figmaCtx.summary:''}\n\nGenerate 4-5 strategic epics. JSON array: [{"id":1,"title":"...","description":"...","priority":"high"|"medium"|"low","tags":[]}]`
    );
    sp.stop();
    const parsed = parseJ(getText(data));
    if (!parsed?.length) { fail('Could not parse epics.'); return; }
    S.epics = parsed;
    ok(`${S.epics.length} epics generated`); sep();
    hdr('Epics  —  /pmharness-epic <n> to select');
    S.epics.forEach((e,i) => { info(`  ${col(A.dim,`[${i+1}]`)}  ${col(A.bold,e.title)}  ${priTag(e.priority)}`); dim('       '+clip(e.description,72)); });
    dim('\n  Next → /pmharness-epic 1');
    saveMarkdown('epics.md', mdEpics());
  } catch(ex) { sp.stop(); fail('Error: '+ex.message); }
  sep();
}

function cmdEpicsList() {
  if (!S.epics.length) { fail('No epics yet.'); return; }
  hdr('Epics');
  S.epics.forEach((e,i) => {
    const active = S.selEpic===e.id ? col(A.teal,' ◀ active') : '';
    const pushed = S.pushed['epic-'+e.id] ? col(A.teal,`  ↑ ${S.pushed['epic-'+e.id]}`) : '';
    info(`  ${col(A.dim,`[${i+1}]`)}  ${e.title}  ${priTag(e.priority)}${pushed}${active}`);
  });
  sep();
}

function cmdSelectEpic(arg) {
  const n = parseInt(arg);
  if (isNaN(n)||n<1||n>S.epics.length) { fail('Invalid number.'); return; }
  const e = S.epics[n-1];
  S.selEpic=e.id; S.stories=[]; S.usecases=[]; S.tasks=[];
  sep(); ok(`Active epic: ${col(A.bold,e.title)}`); dim('  '+e.description);
  dim('  Next → /pmharness-stories  or  /pmharness-usecases'); sep();
}

async function cmdGenStories() {
  if (S.selEpic==null) { fail('Select an epic first.'); return; }
  const epic = S.epics.find(e=>e.id===S.selEpic);
  sep(); const sp = spinner('Generating user stories...');
  try {
    const data = await claude(
      'You are an expert agile product manager. Respond ONLY with pure JSON — no markdown, no backticks.',
      `Product: ${S.name}\nStack: ${S.stack}\nEpic: ${epic.title}\n${epic.description}${S.figmaCtx?'\nFigma: '+(S.figmaCtx.details||S.figmaCtx.summary):''}\n\nGenerate 3-4 user stories. JSON array: [{"id":1,"role":"...","action":"...","benefit":"...","acceptanceCriteria":["..."],"complexity":"S"|"M"|"L"|"XL"}]`
    );
    sp.stop();
    const parsed = parseJ(getText(data));
    if (!parsed) { fail('Could not parse stories.'); return; }
    S.stories = parsed;
    ok(`${S.stories.length} stories generated`); sep();
    hdr('User Stories  —  /pmharness-story <n> for detail');
    S.stories.forEach((s,i) => info(`  ${col(A.dim,`[${i+1}]`)}  As a ${col(A.bold,s.role)}, I want ${clip(s.action,44)}  ${sizeTag(s.complexity)}`));
    dim('\n  Next → /pmharness-usecases  or  /pmharness-tasks');
    saveMarkdown('stories.md', mdStories());
  } catch(ex) { sp.stop(); fail('Error: '+ex.message); }
  sep();
}

function cmdStoriesList() {
  if (!S.stories.length) { fail('No stories yet.'); return; }
  hdr('User Stories');
  S.stories.forEach((s,i) => {
    const pushed = S.pushed['story-'+s.id] ? col(A.teal,`  ↑ ${S.pushed['story-'+s.id]}`) : '';
    info(`  ${col(A.dim,`[${i+1}]`)}  As a ${col(A.bold,s.role)}, I want ${clip(s.action,44)}  ${sizeTag(s.complexity)}${pushed}`);
  });
  sep();
}

function cmdStoryDetail(arg) {
  const n = parseInt(arg);
  if (isNaN(n)||n<1||n>S.stories.length) { fail('Invalid number.'); return; }
  const s = S.stories[n-1];
  hdr(`Story #${n}`);
  info(`  As a ${col(A.bold,s.role)}`); info(`  I want ${col(A.bold,s.action)}`); info(`  so that ${col(A.bold,s.benefit)}`);
  info(`  Complexity: ${sizeTag(s.complexity)}`);
  if (s.acceptanceCriteria?.length) { sep(); dim('  Acceptance criteria:'); s.acceptanceCriteria.forEach(a=>dim('    ✓ '+a)); }
  sep();
}

async function cmdGenUseCases() {
  if (S.selEpic==null) { fail('Select an epic first.'); return; }
  const epic = S.epics.find(e=>e.id===S.selEpic);
  sep(); const sp = spinner('Generating use cases...');
  const storyCtx = S.stories.length ? '\nUser stories:\n'+S.stories.map(s=>`- As a ${s.role}: ${s.action}`).join('\n') : '';
  try {
    const data = await claude(
      'You are an expert systems analyst. Respond ONLY with pure JSON — no markdown, no backticks.',
      `Product: ${S.name}\nStack: ${S.stack}\nUsers: ${S.users}\nEpic: ${epic.title}\n${epic.description}${storyCtx}${S.figmaCtx?'\nFigma: '+(S.figmaCtx.details||S.figmaCtx.summary):''}\n\nGenerate 3-4 use cases. JSON array: [{"id":1,"title":"...","actor":"...","preconditions":["..."],"mainFlow":["Step 1: ..."],"alternativeFlows":[{"condition":"...","steps":["..."]}],"postconditions":["..."]}]`
    );
    sp.stop();
    const parsed = parseJ(getText(data));
    if (!parsed) { fail('Could not parse use cases.'); return; }
    S.usecases = parsed;
    ok(`${S.usecases.length} use cases generated`); sep();
    hdr('Use Cases  —  /pmharness-usecase <n> for detail');
    S.usecases.forEach((u,i) => info(`  ${col(A.dim,`[${i+1}]`)}  ${col(A.bold,u.title)}  ${col(A.dim,'· '+u.actor)}`));
    dim('\n  Next → /pmharness-tasks');
    saveMarkdown('usecases.md', mdUseCases());
  } catch(ex) { sp.stop(); fail('Error: '+ex.message); }
  sep();
}

function cmdUseCasesList() {
  if (!S.usecases.length) { fail('No use cases yet.'); return; }
  hdr('Use Cases');
  S.usecases.forEach((u,i) => {
    const pushed = S.pushed['uc-'+u.id] ? col(A.teal,`  ↑ ${S.pushed['uc-'+u.id]}`) : '';
    info(`  ${col(A.dim,`[${i+1}]`)}  ${u.title}  ${col(A.dim,'· '+u.actor)}${pushed}`);
  });
  sep();
}

function cmdUseCaseDetail(arg) {
  const n = parseInt(arg);
  if (isNaN(n)||n<1||n>S.usecases.length) { fail('Invalid number.'); return; }
  const u = S.usecases[n-1];
  hdr(`Use Case #${n}: ${u.title}`); info(`  Actor: ${col(A.bold,u.actor)}`);
  if (u.preconditions?.length)  { sep(); teal('  Preconditions:');  u.preconditions.forEach(p=>dim('    · '+p)); }
  if (u.mainFlow?.length)       { sep(); teal('  Main flow:');      u.mainFlow.forEach((s,i)=>info(`    ${i+1}. ${s}`)); }
  if (u.alternativeFlows?.length) { sep(); teal('  Alternative flows:'); u.alternativeFlows.forEach(f=>{ dim('    · '+f.condition); (f.steps||[]).forEach(s=>dim('      - '+s)); }); }
  if (u.postconditions?.length) { sep(); teal('  Postconditions:'); u.postconditions.forEach(p=>dim('    · '+p)); }
  sep();
}

async function cmdGenPrd() {
  if (!S.name||!S.vision) { fail('Run /pmharness-init and /pmharness-set vision first.'); return; }
  sep(); const sp = spinner('Generating PRD...');
  const epicsSec   = S.epics.length    ? '\nEpics:\n'+S.epics.map(e=>`- [${e.priority}] ${e.title}: ${e.description}`).join('\n')       : '';
  const storiesSec = S.stories.length  ? '\nStories:\n'+S.stories.map(s=>`- As a ${s.role}, I want ${s.action}`).join('\n')             : '';
  const ucSec      = S.usecases.length ? '\nUse Cases:\n'+S.usecases.map(u=>`- ${u.title} (actor: ${u.actor})`).join('\n')              : '';
  const figSec     = S.figmaCtx        ? '\nDesign context: '+(S.figmaCtx.details||S.figmaCtx.summary)                                  : '';
  try {
    const data = await claude(
      'You are a senior product manager. Respond ONLY with pure JSON — no markdown, no backticks.',
      `Product: ${S.name}\nVision: ${S.vision}\nStack: ${S.stack}\nUsers: ${S.users}\nSprint: ${S.sprint}${epicsSec}${storiesSec}${ucSec}${figSec}\n\nGenerate a PRD as JSON: {"title":"...","version":"1.0","overview":"...","problemStatement":"...","goals":["..."],"successMetrics":["..."],"personas":[{"name":"...","description":"..."}],"features":[{"title":"...","description":"...","priority":"high|medium|low","requirements":["..."]}],"outOfScope":["..."],"technicalConsiderations":["..."],"risks":[{"risk":"...","mitigation":"..."}],"openQuestions":["..."]}`,
      undefined, 2500
    );
    sp.stop();
    const parsed = parseJ(getText(data));
    if (!parsed) { fail('Could not parse PRD.'); return; }
    S.prd = parsed;
    ok(`PRD generated: ${col(A.bold,parsed.title)}`); sep();
    renderPrd(parsed);
    saveMarkdown('prd.md', mdPrd());
  } catch(ex) { sp.stop(); fail('Error: '+ex.message); }
  sep();
}

function renderPrd(p) {
  hdr(p.title+'  v'+(p.version||'1.0'));
  if (p.overview)         { teal('  Overview');         dim('  '+p.overview); }
  if (p.problemStatement) { sep(); teal('  Problem');        dim('  '+p.problemStatement); }
  if (p.goals?.length)    { sep(); teal('  Goals');          p.goals.forEach(g=>dim('    · '+g)); }
  if (p.features?.length) { sep(); teal('  Features'); p.features.forEach(f=>{ info(`    ${col(A.bold,f.title)} [${(f.priority||'medium').toUpperCase()}]`); dim('    '+f.description); }); }
  if (p.risks?.length)    { sep(); teal('  Risks'); p.risks.forEach(r=>{ dim('    · '+r.risk); dim('      → '+r.mitigation); }); }
  if (p.openQuestions?.length) { sep(); teal('  Open Questions'); p.openQuestions.forEach(q=>dim('    ? '+q)); }
}

async function cmdGenTasks() {
  if (!S.stories.length&&!S.usecases.length) { fail('Run /pmharness-stories or /pmharness-usecases first.'); return; }
  const epic = S.epics.find(e=>e.id===S.selEpic);
  sep(); const sp = spinner('Generating agent tasks...');
  const storySection = S.stories.length  ? `\nUser Stories:\n${S.stories.map((s,i)=>`[${i+1}] As a ${s.role}: ${s.action}`).join('\n')}` : '';
  const ucSection    = S.usecases.length ? `\nUse Cases:\n${S.usecases.map((u,i)=>`[${i+1}] ${u.title} (actor: ${u.actor})`).join('\n')}` : '';
  const figSection   = S.figmaCtx ? `\nFigma (${S.figmaKey}): ${S.figmaCtx.details||S.figmaCtx.summary}` : '';
  const agentHints   = { 'claude-code':'Format for Claude Code CLI. Use file paths and imperative instructions.', 'codex':'Format for OpenAI Codex. Be explicit about function signatures and file structure.', 'copilot':'Format for GitHub Copilot. Focus on inline context and clear expectations.', 'aider':'Format for Aider. Lead with files to edit.', 'cursor':'Format for Cursor. Include file references and describe changes precisely.', 'generic':'Write prompts that work with any code agent.' };
  const agentHint = agentHints[cfg.targetAgent]||agentHints.generic;
  try {
    const data = await claude(
      `You are an expert at writing structured prompts for AI code agents. ${agentHint} Respond ONLY with pure JSON — no markdown, no backticks.`,
      `Product: ${S.name}\nStack: ${S.stack}\nEpic: ${epic?.title||''}${storySection}${ucSection}${figSection}\n\nGenerate 3-4 code agent tasks. JSON array: [{"id":1,"title":"...","agentPrompt":"...","context":"...","constraints":["..."],"expectedOutput":"...","estimatedTokens":"low"|"medium"|"high"}]`
    );
    sp.stop();
    const parsed = parseJ(getText(data));
    if (!parsed) { fail('Could not parse tasks.'); return; }
    S.tasks = parsed;
    ok(`${S.tasks.length} agent tasks generated`); sep();
    hdr('Agent Tasks  —  /pmharness-task <n> for full prompt');
    S.tasks.forEach((t,i) => info(`  ${col(A.dim,`[${i+1}]`)}  ${clip(t.title,52)}  ${col(A.dim,`[${t.estimatedTokens}]`)}`));
    dim('\n  Next: /pmharness-export task <n>  ·  /pmharness-export tasks');
    saveMarkdown('tasks.md', mdTasks());
  } catch(ex) { sp.stop(); fail('Error: '+ex.message); }
  sep();
}

function cmdTasksList() {
  if (!S.tasks.length) { fail('No tasks yet.'); return; }
  hdr('Agent Tasks');
  S.tasks.forEach((t,i) => info(`  ${col(A.dim,`[${i+1}]`)}  ${clip(t.title,52)}  ${col(A.dim,`[${t.estimatedTokens}]`)}`));
  sep();
}

function cmdTaskDetail(arg) {
  const n = parseInt(arg);
  if (isNaN(n)||n<1||n>S.tasks.length) { fail('Invalid number.'); return; }
  const t = S.tasks[n-1];
  hdr(`Task #${n}: ${t.title}`); sep(); info(t.agentPrompt);
  if (t.context)           { sep(); teal('  Context:');      dim('  '+t.context); }
  if (t.constraints?.length) { sep(); teal('  Constraints:'); t.constraints.forEach(c=>dim('    · '+c)); }
  if (t.expectedOutput)    { sep(); teal('  Expected:');     dim('  '+t.expectedOutput); }
  sep(); dim(`  → /pmharness-export task ${n}  to copy to clipboard`); sep();
}

async function cmdPush(tool) {
  if (cfg.provider==='openai') { fail('Jira/Linear push requires Anthropic mode.'); return; }
  if (!tool) { fail('Usage: /pmharness-push jira  or  /pmharness-push linear'); return; }
  if (!S.epics.length) { fail('No epics to push.'); return; }
  if (tool==='jira'&&!S.jira.token)    { fail('Jira not configured. Run /pmharness-config jira'); return; }
  if (tool==='linear'&&!S.linear.apiKey) { fail('Linear not configured. Run /pmharness-config linear'); return; }

  const label = tool==='jira'?'Jira':'Linear';
  const mcpUrl = tool==='jira'?'https://mcp.atlassian.com/mcp':'https://mcp.linear.app/mcp';
  const mcps = [{ type:'url', url:mcpUrl, name:tool+'-mcp' }];
  const sys  = 'You are an assistant that creates issues in PM tools via MCP.';
  const epic = S.epics.find(e=>e.id===S.selEpic);
  sep();

  let sp = spinner(`Pushing ${S.epics.length} epics to ${label}...`);
  const epicPrompt = tool==='jira'
    ? `Jira domain: ${S.jira.domain}\nProject: ${S.jira.project}\n\nCreate one Epic for each:\n\n${S.epics.map((e,i)=>`${i+1}. ${e.title}\n${e.description}\nPriority: ${e.priority}`).join('\n\n')}`
    : `Linear team: ${S.linear.teamId||'default'}\nProject: ${S.name}\n\nCreate one milestone for each:\n\n${S.epics.map((e,i)=>`${i+1}. ${e.title}\n${e.description}`).join('\n\n')}`;
  try { await claude(sys, epicPrompt, mcps); } catch {}
  sp.stop(); S.epics.forEach(e=>{ S.pushed['epic-'+e.id]=label; }); ok(`${S.epics.length} epics pushed to ${label}`);

  if (S.stories.length) {
    sp = spinner(`Pushing ${S.stories.length} stories to ${label}...`);
    const storyPrompt = tool==='jira'
      ? `Jira domain: ${S.jira.domain}\nProject: ${S.jira.project}\nEpic: ${epic?.title||'General'}\n\nCreate one Story for each:\n\n${S.stories.map((s,i)=>`${i+1}. As a ${s.role}, I want ${s.action}\nComplexity: ${s.complexity}`).join('\n\n')}`
      : `Linear team: ${S.linear.teamId||'default'}\nProject: ${S.name}\nEpic: ${epic?.title||'General'}\n\nCreate one issue for each:\n\n${S.stories.map((s,i)=>`${i+1}. As a ${s.role}, I want ${s.action}`).join('\n\n')}`;
    try { await claude(sys, storyPrompt, mcps); } catch {}
    sp.stop(); S.stories.forEach(s=>{ S.pushed['story-'+s.id]=label; }); ok(`${S.stories.length} stories pushed to ${label}`);
  }

  if (S.usecases.length) {
    sp = spinner(`Pushing ${S.usecases.length} use cases to ${label}...`);
    const ucPrompt = tool==='jira'
      ? `Jira domain: ${S.jira.domain}\nProject: ${S.jira.project}\nEpic: ${epic?.title||'General'}\n\nCreate one Sub-task for each:\n\n${S.usecases.map((u,i)=>`${i+1}. ${u.title}\nActor: ${u.actor}`).join('\n\n')}`
      : `Linear team: ${S.linear.teamId||'default'}\nProject: ${S.name}\n\nCreate one sub-issue for each:\n\n${S.usecases.map((u,i)=>`${i+1}. ${u.title}\nActor: ${u.actor}`).join('\n\n')}`;
    try { await claude(sys, ucPrompt, mcps); } catch {}
    sp.stop(); S.usecases.forEach(u=>{ S.pushed['uc-'+u.id]=label; }); ok(`${S.usecases.length} use cases pushed to ${label}`);
  }

  S.pmTool = tool; saveCfg(); sep();
}

// ── Export ────────────────────────────────────────────────────────
// Print a task prompt to stdout — can be piped directly to a code agent
function cmdExportTask(arg) {
  const n = parseInt(arg);
  if (isNaN(n)||n<1||n>S.tasks.length) { fail('Invalid number.'); return; }
  sep(); process.stdout.write(S.tasks[n-1].agentPrompt + '\n'); sep();
  dim(`  → pipe to your agent: pmharness | claude  (or paste the output above)`);
}

function cmdExportTasks() {
  if (!S.tasks.length) { fail('No tasks yet.'); return; }
  saveMarkdown('tasks.md', mdTasks());
  ok(`pm-specs/tasks.md updated — ${S.tasks.length} tasks`);
}

function cmdExportPrd() {
  if (!S.prd) { fail('No PRD yet. Run /pmharness-prd first.'); return; }
  saveMarkdown('prd.md', mdPrd());
  ok('pm-specs/prd.md updated');
}

function cmdExportAll() {
  const epic = S.epics.find(e=>e.id===S.selEpic);
  const md = [`# ${S.name} — PM Spec\n`,`## Vision\n\n${S.vision}\n`,`## Tech Stack\n\n${S.stack}\n`,`## Target Users\n\n${S.users}\n`,
    epic ? `## Epic: ${epic.title}\n\n${epic.description}\n` : '',
    S.stories.length ? `## User Stories\n\n${S.stories.map(s=>`- As a ${s.role}, I want to ${s.action} so that ${s.benefit}`).join('\n')}\n` : '',
    S.usecases.length ? `## Use Cases\n\n${S.usecases.map(u=>`- ${u.title} (actor: ${u.actor})`).join('\n')}\n` : '',
    S.tasks.length    ? `## Agent Tasks\n\n${S.tasks.map((t,i)=>`### Task ${i+1}: ${t.title}\n\n\`\`\`\n${t.agentPrompt}\n\`\`\``).join('\n\n')}` : '',
  ].join('\n');
  saveMarkdown('spec.md', md);
  ok('pm-specs/spec.md updated — full spec saved');
  dim('  Includes: vision · stack · users · epic · stories · use cases · tasks');
}

// ── Import ─────────────────────────────────────────────────────────
async function cmdImport(filePath) {
  if (!filePath) { fail('Usage: /pmharness-import <path/to/file>'); return; }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) { fail('File not found: '+resolved); return; }
  sep(); const sp = spinner('Importing '+path.basename(resolved)+'...');
  try {
    const ext = path.extname(resolved).toLowerCase();
    let extraContent = null, userMsg = '';
    if (ext==='.pdf') {
      const b64 = fs.readFileSync(resolved).toString('base64');
      extraContent = [{ type:'document', source:{ type:'base64', media_type:'application/pdf', data:b64 } }];
      userMsg = 'Extract product context from this document. Return JSON: {"name":"...","vision":"...","stack":"...","users":"...","sprint":"..."}';
    } else {
      const text = fs.readFileSync(resolved,'utf8');
      userMsg = `Extract product context from this document:\n\n${text}\n\nReturn JSON: {"name":"...","vision":"...","stack":"...","users":"...","sprint":"..."}`;
    }
    const result = await claude('You are a product manager extracting context from a spec. Return ONLY pure JSON.', userMsg, undefined, undefined, extraContent);
    sp.stop();
    const parsed = parseJ(getText(result));
    if (!parsed) { fail('Could not parse document.'); return; }
    if (parsed.name)   { S.name   = parsed.name;   ok('name: '+S.name); }
    if (parsed.vision) { S.vision = parsed.vision; ok('vision: '+clip(S.vision,60)); }
    if (parsed.stack)  { S.stack  = parsed.stack;  ok('stack: '+S.stack); }
    if (parsed.users)  { S.users  = parsed.users;  ok('users: '+clip(S.users,60)); }
    if (parsed.sprint) { S.sprint = parsed.sprint; ok('sprint: '+clip(S.sprint,60)); }
    ok('Import complete. Verify with /pmharness-ctx');
  } catch(ex) { sp.stop(); fail('Error: '+ex.message); }
  sep();
}

// ── Figma ──────────────────────────────────────────────────────────
async function cmdFigma(input) {
  if (cfg.provider==='openai') { fail('Figma MCP requires Anthropic mode.'); return; }
  let key = (input||S.figmaKey||'').trim();
  if (!key) { fail('Usage: /pmharness-figma <url or file key>'); return; }
  const m = key.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
  if (m) key = m[1];
  S.figmaKey = key;
  sep(); const sp = spinner('Connecting to Figma: '+key+'...');
  const mcpUrl = S.figmaToken ? `https://mcp.figma.com/mcp?access_token=${S.figmaToken}` : 'https://mcp.figma.com/mcp';
  try {
    const data = await claude(
      'You are a UI/UX analyst. Extract design context. Return JSON: {"summary":"...","components":["..."],"flows":["..."],"colors":["..."],"details":"..."}',
      `Extract design context from Figma file key: ${key}`,
      [{ type:'url', url:mcpUrl, name:'figma-mcp' }]
    );
    sp.stop();
    const raw = getText(data);
    S.figmaCtx = parseJ(raw) || { summary:raw.slice(0,500), details:raw };
    ok('Figma connected: '+key); dim('  '+clip(S.figmaCtx.summary,80));
  } catch(ex) { sp.stop(); fail('Figma error: '+ex.message); }
  sep();
}

// ── Status & Summary ──────────────────────────────────────────────
function cmdStatus() {
  hdr('Status');
  teal('  Agent');
  info(`    Provider     ${cfg.provider==='openai'?'OpenAI':'Anthropic'}`);
  info(`    Model        ${cfg.model}`);
  info(`    Target agent ${cfg.targetAgent}`);
  info(`    Max tokens   ${cfg.maxTokens}`);
  info(`    API key      ${cfg.provider==='openai' ? (cfg.openaiKey?col(A.teal,'set'):col(A.red,'not set')) : (cfg.apiKey?col(A.teal,'set'):col(A.dim,'env / not set'))}`);
  teal('  Integrations');
  info(`    Figma   ${S.figmaCtx?col(A.teal,'✓ '+S.figmaKey):col(A.dim,'not connected')}`);
  info(`    Jira    ${S.jira.token?col(A.teal,'✓ '+S.jira.domain):col(A.dim,'not configured')}`);
  info(`    Linear  ${S.linear.apiKey?col(A.teal,'✓ configured'):col(A.dim,'not configured')}`);
  info(`    Active  ${S.pmTool||col(A.dim,'none')}`);
  teal('  File export');
  info(`    pm-specs/  ${col(A.teal, path.resolve('pm-specs'))}`);
  sep();
}

function cmdSummary() {
  const epic = S.epics.find(e=>e.id===S.selEpic);
  hdr('Spec Summary — '+(S.name||'No product'));
  [['Vision',clip(S.vision,64)],['Stack',S.stack],['Figma',S.figmaCtx?'✓ '+S.figmaKey:'—'],
   ['Epics',S.epics.length],['Active epic',epic?.title||'—'],['Stories',S.stories.length],
   ['Use cases',S.usecases.length],['Tasks',S.tasks.length],['PM tool',S.pmTool||'—'],
   ['Pushed',Object.keys(S.pushed).length+' items']
  ].forEach(([k,v])=>info(`  ${col(A.dim,k.padEnd(14))}  ${v}`));
  sep();
}

// ── Config prompts ────────────────────────────────────────────────
async function cmdConfigAgent() {
  sep(); hdr('Configure Agent');
  cfg.provider    = await ask('Provider [anthropic/openai]', cfg.provider);
  if (cfg.provider==='openai') {
    cfg.openaiKey = await ask('OpenAI API key', cfg.openaiKey||'');
    cfg.model     = await ask('Model [gpt-4o/gpt-4o-mini/o3]', cfg.model||'gpt-4o');
  } else {
    cfg.apiKey    = await ask('Anthropic API key (blank = use ANTHROPIC_API_KEY env)', cfg.apiKey||'');
    cfg.model     = await ask('Model', cfg.model||'claude-sonnet-4-20250514');
  }
  cfg.targetAgent = await ask('Target agent [generic/claude-code/codex/copilot/aider/cursor]', cfg.targetAgent);
  cfg.maxTokens   = parseInt(await ask('Max tokens', String(cfg.maxTokens)))||1000;
  saveCfg(); ok('Config saved ✓'); sep();
}

async function cmdConfigJira() {
  sep(); hdr('Configure Jira');
  S.jira.domain  = await ask('Atlassian domain', S.jira.domain);
  S.jira.email   = await ask('Email', S.jira.email);
  S.jira.token   = await ask('API token', '');
  S.jira.project = await ask('Project key', S.jira.project);
  S.pmTool = 'jira'; saveCfg(); ok('Jira configured ✓'); sep();
}

async function cmdConfigLinear() {
  sep(); hdr('Configure Linear');
  S.linear.apiKey = await ask('Linear API key', '');
  S.linear.teamId = await ask('Team ID (optional)', S.linear.teamId);
  S.pmTool = 'linear'; saveCfg(); ok('Linear configured ✓'); sep();
}

async function cmdConfigFigma() {
  sep(); hdr('Configure Figma');
  S.figmaToken = await ask('Figma personal access token (figd_…)', S.figmaToken||'');
  S.figmaKey   = await ask('Figma file key or URL', S.figmaKey);
  saveCfg(); ok('Figma config saved. Run /pmharness-figma to connect.'); sep();
}

// ── Help ───────────────────────────────────────────────────────────
const CMDS = [
  {c:'/pmharness-init',a:'<name>',d:'Start a new product session'},
  {c:'/pmharness-set vision',a:'<text>',d:'Product vision'},
  {c:'/pmharness-set stack',a:'<tech>',d:'Tech stack'},
  {c:'/pmharness-set users',a:'<text>',d:'Target users'},
  {c:'/pmharness-set sprint',a:'<text>',d:'Sprint focus'},
  {c:'/pmharness-ctx',a:'',d:'Show product context'},
  {c:'/pmharness-import',a:'<file>',d:'Import a spec file (.txt .md .pdf)'},
  {c:'/pmharness-epics',a:'',d:'Generate epics'},
  {c:'/pmharness-epics list',a:'',d:'List all epics'},
  {c:'/pmharness-epic',a:'<n>',d:'Select epic n as active'},
  {c:'/pmharness-stories',a:'',d:'Generate user stories'},
  {c:'/pmharness-stories list',a:'',d:'List all stories'},
  {c:'/pmharness-story',a:'<n>',d:'Full story detail'},
  {c:'/pmharness-usecases',a:'',d:'Generate use cases'},
  {c:'/pmharness-usecases list',a:'',d:'List all use cases'},
  {c:'/pmharness-usecase',a:'<n>',d:'Full use case detail'},
  {c:'/pmharness-prd',a:'',d:'Generate a PRD'},
  {c:'/pmharness-prd view',a:'',d:'Re-display the PRD'},
  {c:'/pmharness-tasks',a:'',d:'Generate agent tasks'},
  {c:'/pmharness-tasks list',a:'',d:'List all tasks'},
  {c:'/pmharness-task',a:'<n>',d:'Full agent prompt for task n'},
  {c:'/pmharness-export task',a:'<n>',d:'Copy task n to clipboard'},
  {c:'/pmharness-export tasks',a:'',d:'Copy all tasks as Markdown'},
  {c:'/pmharness-export prd',a:'',d:'Copy PRD as Markdown'},
  {c:'/pmharness-export all',a:'',d:'Copy full spec as Markdown'},
  {c:'/pmharness-figma',a:'<url|key>',d:'Connect Figma file'},
  {c:'/pmharness-config agent',a:'',d:'Configure AI provider and model'},
  {c:'/pmharness-config jira',a:'',d:'Configure Jira credentials'},
  {c:'/pmharness-config linear',a:'',d:'Configure Linear credentials'},
  {c:'/pmharness-config figma',a:'',d:'Configure Figma access'},
  {c:'/pmharness-push jira',a:'',d:'Push epics/stories/use cases to Jira'},
  {c:'/pmharness-push linear',a:'',d:'Push epics/stories/use cases to Linear'},
  {c:'/pmharness-summary',a:'',d:'Spec summary'},
  {c:'/pmharness-status',a:'',d:'Integration and config status'},
  {c:'/pmharness-help',a:'[filter]',d:'Show all commands'},
  {c:'/pmharness-clear',a:'',d:'Clear screen'},
  {c:'/pmharness-reset',a:'',d:'Reset session'},
];

function cmdHelp(filter) {
  hdr('Commands'+(filter?' — '+filter:''));
  const list = filter ? CMDS.filter(c=>c.c.includes(filter)||c.d.toLowerCase().includes(filter.toLowerCase())) : CMDS;
  list.forEach(c => info(`  ${col(A.teal,(c.c+' '+c.a).padEnd(36))}  ${col(A.dim,c.d)}`));
  sep();
}

// ── Reset ──────────────────────────────────────────────────────────
function cmdReset() {
  Object.assign(S,{ name:'',vision:'',stack:'',users:'',sprint:'',epics:[],selEpic:null,stories:[],usecases:[],prd:null,tasks:[],figmaCtx:null,figmaKey:'',pmTool:null,pushed:{} });
  console.clear(); boot();
}

// ── Command router ─────────────────────────────────────────────────
async function run(input) {
  if (!input||!input.startsWith('/')) { dim('  Commands start with /  — type /pmharness-help'); return; }
  const parts = input.trim().split(/\s+/);
  const c0  = parts[0].toLowerCase();
  const c01 = (parts[0]+' '+(parts[1]||'')).toLowerCase();
  const rest = parts.slice(1).join(' ');

  if (input==='/pmharness-clear')              { console.clear(); return; }
  if (input==='/pmharness-reset')              { cmdReset(); return; }
  if (c0==='/pmharness-help')                  return cmdHelp(rest);
  if (c0==='/pmharness-status')                return cmdStatus();
  if (c0==='/pmharness-summary')               return cmdSummary();
  if (c0==='/pmharness-import')                return cmdImport(rest);
  if (c0==='/pmharness-init')                  return cmdInit(rest);
  if (c0==='/pmharness-ctx'||c0==='/pmharness-context') return cmdCtx();
  if (c01==='/pmharness-set vision')           return cmdSet('vision',  parts.slice(2).join(' '));
  if (c01==='/pmharness-set stack')            return cmdSet('stack',   parts.slice(2).join(' '));
  if (c01==='/pmharness-set users')            return cmdSet('users',   parts.slice(2).join(' '));
  if (c01==='/pmharness-set sprint')           return cmdSet('sprint',  parts.slice(2).join(' '));
  if (c01==='/pmharness-epics list')           return cmdEpicsList();
  if (c0==='/pmharness-epics')                 return cmdGenEpics();
  if (c0==='/pmharness-epic')                  return cmdSelectEpic(rest);
  if (c01==='/pmharness-stories list')         return cmdStoriesList();
  if (c0==='/pmharness-stories')               return cmdGenStories();
  if (c0==='/pmharness-story')                 return cmdStoryDetail(rest);
  if (c01==='/pmharness-usecases list')        return cmdUseCasesList();
  if (c0==='/pmharness-usecases')              return cmdGenUseCases();
  if (c0==='/pmharness-usecase')               return cmdUseCaseDetail(rest);
  if (c01==='/pmharness-prd view')             { if (!S.prd){fail('No PRD yet.');return;} sep(); renderPrd(S.prd); sep(); return; }
  if (c0==='/pmharness-prd')                   return cmdGenPrd();
  if (c01==='/pmharness-tasks list')           return cmdTasksList();
  if (c0==='/pmharness-tasks')                 return cmdGenTasks();
  if (c0==='/pmharness-task')                  return cmdTaskDetail(rest);
  if (c01==='/pmharness-export task')          return cmdExportTask(parts[2]);
  if (c01==='/pmharness-export tasks')         return cmdExportTasks();
  if (c01==='/pmharness-export prd')           return cmdExportPrd();
  if (c01==='/pmharness-export all')           return cmdExportAll();
  if (c0==='/pmharness-figma')                 return cmdFigma(rest);
  if (c01==='/pmharness-config agent')         return cmdConfigAgent();
  if (c01==='/pmharness-config jira')          return cmdConfigJira();
  if (c01==='/pmharness-config linear')        return cmdConfigLinear();
  if (c01==='/pmharness-config figma')         return cmdConfigFigma();
  if (c01==='/pmharness-push jira')            return cmdPush('jira');
  if (c01==='/pmharness-push linear')          return cmdPush('linear');
  if (c0==='/pmharness-push')                  return cmdPush(S.pmTool);
  fail('Unknown command. Type /pmharness-help');
}

// ── Boot ───────────────────────────────────────────────────────────
function boot() {
  sep();
  console.log(col(A.bold,'PM Harness CLI')+col(A.dim,'  ·  Code Agent Pipeline'));
  dim('  Anthropic / OpenAI  ·  Figma MCP  ·  Jira  ·  Linear  ·  MIT License');
  sep();
  dim('  /pmharness-init <name>  →  /pmharness-set vision|stack|users');
  dim('  /pmharness-epics  →  /pmharness-stories  →  /pmharness-usecases');
  dim('  /pmharness-push  →  /pmharness-tasks  →  /pmharness-export task <n>');
  sep();
  dim('  Files auto-save to: '+col(A.teal, path.resolve('pm-specs')));
  dim('  Config stored at:   '+col(A.teal, CFG_FILE));
  sep();
  dim('  /pmharness-help for all commands  ·  Tab to autocomplete  ·  Ctrl+C to exit');
  sep();
}

// ── REPL ───────────────────────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: col(A.teal,'▸')+' ',
  completer(line) {
    const hits = CMDS.map(c=>c.c).filter(c=>c.startsWith(line));
    return [hits.length ? hits : [], line];
  },
});

loadCfg();
boot();
rl.prompt();

rl.on('line', async input => {
  const cmd = input.trim();
  if (cmd) { rl.pause(); await run(cmd); rl.resume(); }
  rl.prompt();
});

rl.on('close', () => { sep(); dim('  Goodbye.'); sep(); process.exit(0); });
