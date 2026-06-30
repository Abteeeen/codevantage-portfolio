import 'dotenv/config';
import fetch from 'node-fetch';
import { inZone, isStandaloneHouse } from '../lib/zones.js';
import { geocodeAddress } from '../lib/geocode.js';

/**
 * Sources a candidate address list for a target region using an Apify real-estate
 * listing actor (or any property data source — swap this out for whatever feed
 * you have access to). Filters immediately through the In-Zone Gate so downstream
 * stages never waste API calls on out-of-area or non-standalone properties.
 *
 * Usage: node scripts/01-fetch-addresses.js --region brisbane
 */
export async function fetchAddresses(region) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID;

  if (!APIFY_TOKEN || !APIFY_ACTOR_ID) {
    console.warn('[01-fetch-addresses] APIFY_TOKEN/APIFY_ACTOR_ID not set — returning sample addresses for testing.');
    return sampleAddresses(region);
  }

  const res = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region, propertyType: 'house', country: 'AU', state: 'QLD' })
    }
  );

  if (!res.ok) throw new Error(`Apify run failed (${res.status}): ${await res.text()}`);

  const listings = await res.json();

  // Real listings sometimes hide the street ("Address available on request") —
  // those can't be geocoded or mailed, so drop them before the zone gate.
  const candidates = listings
    .filter((l) => isStandaloneHouse(l.propertyType))
    .filter((l) => inZone(l.address?.postcode))
    .filter((l) => l.address?.street && !l.address.street.toLowerCase().includes('available on request'));

  const geocoded = [];
  for (const l of candidates) {
    const coords = await geocodeAddress(l.address.full);
    if (!coords) continue;
    geocoded.push({
      address: l.address.full,
      lat: coords.lat,
      lng: coords.lng,
      postcode: l.address.postcode,
      suburb: l.address.suburb,
      propertyType: l.propertyType,
      listingType: l.listingType,
      zone: inZone(l.address.postcode)
    });
  }

  return geocoded;
}

function sampleAddresses(region) {
  const samples = {
    brisbane: [
      { address: '12 Bullard St, Bardon QLD', lat: -27.4639, lng: 152.9886, postcode: 4065, suburb: 'Bardon' },
      { address: '8 Markham Ave, Carindale QLD', lat: -27.5039, lng: 153.1078, postcode: 4152, suburb: 'Carindale' }
    ],
    'gold-coast': [
      { address: '21 Hedges Ave, Mermaid Beach QLD', lat: -28.0539, lng: 153.4458, postcode: 4218, suburb: 'Mermaid Beach' },
      { address: '5 Monaco St, Broadbeach Waters QLD', lat: -28.0339, lng: 153.4189, postcode: 4218, suburb: 'Broadbeach Waters' }
    ]
  };
  return (samples[region] || []).map((a) => ({ ...a, zone: inZone(a.postcode) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const region = process.argv.includes('--region')
    ? process.argv[process.argv.indexOf('--region') + 1]
    : 'brisbane';
  fetchAddresses(region).then((addrs) => console.log(JSON.stringify(addrs, null, 2)));
}
