import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { renderLushLawn } from '../lib/imageEdit.js';

/**
 * Renders the photoreal "lush green lawn" version of the top-ranked lead.
 * Intentionally only called for the single best address per run — this is the
 * most expensive API call in the pipeline (~$0.02-0.07), so it should never run
 * on every scanned property, only the one actually worth pitching.
 */
export async function renderTopLead(lead) {
  mkdirSync('output/renders', { recursive: true });

  const original = readFileSync(lead.imagePath);
  const rendered = await renderLushLawn(original);

  const outPath = `output/renders/${lead.postcode}-${slug(lead.address)}-lush.png`;
  writeFileSync(outPath, rendered);

  console.log(`[05-render-lawn] Rendered ${lead.address} -> ${outPath}`);
  return { ...lead, renderPath: outPath };
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('fs');
  const { topLead } = await import('./04-rank-leads.js');
  const classified = JSON.parse(readFileSync('output/classified.json', 'utf-8'));
  const lead = topLead(classified);
  if (!lead) throw new Error('No qualifying lead found.');
  renderTopLead(lead);
}
