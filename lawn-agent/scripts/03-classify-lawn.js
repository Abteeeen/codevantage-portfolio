import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { classifyLawn } from '../lib/vision.js';

/**
 * Runs the AI lawn-condition classifier over every fetched satellite image.
 */
export async function classifyAddresses(addressesWithImages) {
  const results = [];

  for (const addr of addressesWithImages) {
    try {
      const imageBuffer = readFileSync(addr.imagePath);
      const classification = await classifyLawn(imageBuffer);
      results.push({ ...addr, ...classification });
      console.log(`[03-classify-lawn] ${addr.address}: ${classification.lawnCondition} (tier ${classification.houseQualityTier})`);
    } catch (err) {
      console.error(`[03-classify-lawn] FAILED ${addr.address}: ${err.message}`);
    }
  }

  writeFileSync('output/classified.json', JSON.stringify(results, null, 2));
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { fetchAddresses } = await import('./01-fetch-addresses.js');
  const { fetchSatelliteForAddresses } = await import('./02-fetch-satellite.js');
  const addrs = await fetchAddresses('brisbane');
  const withImages = await fetchSatelliteForAddresses(addrs);
  classifyAddresses(withImages);
}
