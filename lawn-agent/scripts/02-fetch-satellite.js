import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { fetchSatelliteImage } from '../lib/mapbox.js';

/**
 * Pulls a Mapbox satellite image for every address and writes it to output/satellite/.
 * Usage: addresses array piped in from 01-fetch-addresses, or run standalone for a single test address.
 */
export async function fetchSatelliteForAddresses(addresses) {
  mkdirSync('output/satellite', { recursive: true });
  const results = [];

  for (const addr of addresses) {
    try {
      const image = await fetchSatelliteImage(addr.lat, addr.lng);
      const filename = `output/satellite/${addr.postcode}-${slug(addr.address)}.jpg`;
      writeFileSync(filename, image);
      results.push({ ...addr, imagePath: filename });
      console.log(`[02-fetch-satellite] OK ${addr.address} -> ${filename}`);
    } catch (err) {
      console.error(`[02-fetch-satellite] FAILED ${addr.address}: ${err.message}`);
    }
  }
  return results;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { fetchAddresses } = await import('./01-fetch-addresses.js');
  const addrs = await fetchAddresses('brisbane');
  fetchSatelliteForAddresses(addrs);
}
