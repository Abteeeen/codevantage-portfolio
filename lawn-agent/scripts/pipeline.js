import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { fetchAddresses } from './01-fetch-addresses.js';
import { fetchSatelliteForAddresses } from './02-fetch-satellite.js';
import { classifyAddresses } from './03-classify-lawn.js';
import { topLead, rankLeads } from './04-rank-leads.js';
import { renderTopLead } from './05-render-lawn.js';
import { lookupOwner } from './06-lookup-owner.js';
import { generatePostcard } from './07-generate-postcard.js';
import { dispatchPostcard } from './08-send-postcard.js';

/**
 * Runs the full Lawn Agent pipeline end-to-end for one region.
 * By design, only the single TOP-ranked lead reaches the expensive render +
 * mail stages each run — keeps cost predictable while you scale up volume.
 *
 * Usage:
 *   node scripts/pipeline.js --region brisbane
 *   node scripts/pipeline.js --region gold-coast --dry-run
 */
async function run() {
  const region = process.argv.includes('--region')
    ? process.argv[process.argv.indexOf('--region') + 1]
    : 'brisbane';
  const dryRun = process.argv.includes('--dry-run');

  mkdirSync('output', { recursive: true });

  console.log(`\n=== Lawn Agent — ${region} ===\n`);

  console.log('1/8 Fetching candidate addresses (In-Zone Gate applied)...');
  const addresses = await fetchAddresses(region);
  console.log(`   -> ${addresses.length} in-zone standalone houses found`);

  console.log('2/8 Pulling satellite imagery (Mapbox)...');
  const withImages = await fetchSatelliteForAddresses(addresses);

  console.log('3/8 Classifying lawn condition (AI vision)...');
  const classified = await classifyAddresses(withImages);

  console.log('4/8 Ranking leads...');
  const ranked = rankLeads(classified);
  writeFileSync('output/ranked.json', JSON.stringify(ranked, null, 2));
  const lead = ranked[0];

  if (!lead) {
    console.log('No qualifying dead-lawn lead found this run. Exiting.');
    return;
  }
  console.log(`   -> Top lead: ${lead.address} (score ${lead.score.toFixed(2)})`);

  console.log('5/8 Rendering lush-green restoration...');
  const rendered = await renderTopLead(lead);

  console.log('6/8 Looking up property owner...');
  const withOwner = await lookupOwner(rendered);

  console.log('7/8 Generating postcard payload...');
  const postcard = generatePostcard(withOwner, {
    publicRenderUrl: process.env.PUBLIC_RENDER_URL_BASE
      ? `${process.env.PUBLIC_RENDER_URL_BASE}/${withOwner.renderPath}`
      : withOwner.renderPath,
    landingPageUrl: process.env.LANDING_PAGE_URL || 'https://example.com/lawn-quote'
  });

  if (dryRun) {
    console.log('\n--dry-run set, skipping postcard dispatch. Final payload:');
    console.log(JSON.stringify(postcard, null, 2));
    return;
  }

  console.log('8/8 Dispatching postcard via PostGrid...');
  await dispatchPostcard(postcard);

  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
