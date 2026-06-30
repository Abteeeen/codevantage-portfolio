import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const zones = JSON.parse(readFileSync(join(__dirname, '../data/qld-zones.json'), 'utf-8'));

/**
 * Deterministic In-Zone Gate. Returns the matching region id, or null if the
 * postcode falls outside Brisbane / Gold Coast. Zero cost, zero API calls.
 */
export function inZone(postcode) {
  const pc = Number(postcode);
  for (const region of zones.regions) {
    if (region.excludePostcodes.includes(pc)) continue;
    for (const [min, max] of region.postcodeRanges) {
      if (pc >= min && pc <= max) return region.id;
    }
  }
  return null;
}

export function isStandaloneHouse(propertyType) {
  const t = (propertyType || '').toLowerCase();
  return !zones.keywordExcludeSuburbTypes.some((excluded) => t.includes(excluded));
}

export { zones };
