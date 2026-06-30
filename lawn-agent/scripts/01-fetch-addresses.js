import 'dotenv/config';
import fetch from 'node-fetch';
import { inZone, isStandaloneHouse } from '../lib/zones.js';
import { geocodeAddress } from '../lib/geocode.js';
import { searchListings } from '../lib/domain.js';

/**
 * Sources a candidate address list for a target region.
 *
 * Free default (DATA_SOURCE unset or "domain"): Domain.com.au Developer API —
 * official, no ToS risk, free tier.
 *
 * Paid path (DATA_SOURCE=apify): Apify real-estate scraper actor. Only worth the
 * per-result cost once there are paying clients — see README for setup. Kept here
 * so switching back is a one-line env change, not a rewrite.
 *
 * Usage: node scripts/01-fetch-addresses.js --region brisbane
 */
export async function fetchAddresses(region) {
  const dataSource = (process.env.DATA_SOURCE || 'domain').toLowerCase();

  const listings =
    dataSource === 'apify' ? await fetchFromApify(region) : await fetchFromDomain(region);

  const geocoded = [];
  for (const l of listings) {
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

const REGION_SUBURBS = {
  brisbane: ['Bardon', 'Carindale', 'Indooroopilly', 'Wynnum', 'Paddington'],
  'gold-coast': ['Mermaid Beach', 'Broadbeach Waters', 'Burleigh Heads']
};

async function fetchFromDomain(region) {
  if (!process.env.DOMAIN_CLIENT_ID || !process.env.DOMAIN_CLIENT_SECRET) {
    console.warn('[01-fetch-addresses] DOMAIN_CLIENT_ID/DOMAIN_CLIENT_SECRET not set — returning sample addresses for testing.');
    return sampleListings(region);
  }

  const suburbs = REGION_SUBURBS[region] || REGION_SUBURBS.brisbane;
  const results = [];

  for (const suburb of suburbs) {
    const listings = await searchListings({ suburb, state: 'QLD' });
    for (const item of listings) {
      const p = item.listing || item;
      const street = p.propertyDetails?.street || p.address?.street;
      if (!street || street.toLowerCase().includes('available on request')) continue;
      results.push({
        address: {
          full: p.propertyDetails?.displayableAddress || p.address?.full,
          street,
          suburb: p.propertyDetails?.suburb || p.address?.suburb,
          postcode: p.propertyDetails?.postcode || p.address?.postcode
        },
        propertyType: p.propertyDetails?.propertyType || 'house',
        listingType: 'buy'
      });
    }
  }

  return results
    .filter((l) => isStandaloneHouse(l.propertyType))
    .filter((l) => inZone(l.address.postcode));
}

async function fetchFromApify(region) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID;

  if (!APIFY_TOKEN || !APIFY_ACTOR_ID) {
    console.warn('[01-fetch-addresses] APIFY_TOKEN/APIFY_ACTOR_ID not set — returning sample addresses for testing.');
    return sampleListings(region);
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
  return listings
    .filter((l) => isStandaloneHouse(l.propertyType))
    .filter((l) => inZone(l.address?.postcode))
    .filter((l) => l.address?.street && !l.address.street.toLowerCase().includes('available on request'));
}

function sampleListings(region) {
  const samples = {
    brisbane: [
      { address: { full: '12 Bullard St, Bardon QLD', street: '12 Bullard St', postcode: 4065, suburb: 'Bardon' }, propertyType: 'house', listingType: 'buy' },
      { address: { full: '8 Markham Ave, Carindale QLD', street: '8 Markham Ave', postcode: 4152, suburb: 'Carindale' }, propertyType: 'house', listingType: 'buy' }
    ],
    'gold-coast': [
      { address: { full: '21 Hedges Ave, Mermaid Beach QLD', street: '21 Hedges Ave', postcode: 4218, suburb: 'Mermaid Beach' }, propertyType: 'house', listingType: 'buy' },
      { address: { full: '5 Monaco St, Broadbeach Waters QLD', street: '5 Monaco St', postcode: 4218, suburb: 'Broadbeach Waters' }, propertyType: 'house', listingType: 'buy' }
    ]
  };
  return samples[region] || [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const region = process.argv.includes('--region')
    ? process.argv[process.argv.indexOf('--region') + 1]
    : 'brisbane';
  fetchAddresses(region).then((addrs) => console.log(JSON.stringify(addrs, null, 2)));
}
