// Pre-push check: every local file the home page references must exist with EXACT case.
// GitHub Pages is case-sensitive, Windows is not — this is the bug that only shows up live.
// Run: node check.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import vm from 'node:vm';

const root = import.meta.dirname;
const existsExactCase = rel => {
  const abs = join(root, rel);
  return existsSync(abs) && readdirSync(dirname(abs)).includes(basename(abs));
};

const html = readFileSync(join(root, 'index.html'), 'utf8');
const fromHtml = [...html.matchAll(/(?:src|href)="([^"#?]+)[^"]*"/g)].map(m => m[1])
  .filter(u => !/^(https?:|mailto:|data:)/.test(u));

// relative ES-module imports (static and dynamic) in our own scripts — these never appear in the HTML
const fromJs = ['index.js', 'intro.js', 'intro-kit.js'].filter(f => existsSync(join(root, f))).flatMap(f =>
  [...readFileSync(join(root, f), 'utf8').matchAll(/(?:from\s+|import\()['"]\.\/([^'"]+)['"]/g)].map(m => m[1]));

const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(root, 'agents.js'), 'utf8'), sandbox);
const { AGENTS, FEATURED_COUNT } = sandbox.window;
const fromAgents = AGENTS.flatMap(a => [`media/${a.id}.mp4`, `media/${a.id}.jpg`]);

const problems = [...new Set([...fromHtml, ...fromJs, ...fromAgents])].filter(u => !existsExactCase(u)).map(u => `missing (or wrong case): ${u}`);
if (new Set(AGENTS.map(a => a.id)).size !== AGENTS.length) problems.push('duplicate agent id in agents.js');
if (!(FEATURED_COUNT > 0 && FEATURED_COUNT <= AGENTS.length)) problems.push('FEATURED_COUNT out of range');
AGENTS.filter(a => !(a.name && a.short && a.tag && a.blurb && a.steps?.length >= 3)).forEach(a => problems.push(`incomplete agent entry: ${a.id}`));

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`ok — ${fromHtml.length} page references, ${fromJs.length} script imports, ${AGENTS.length} agents, ${fromAgents.length} media files all present`);
