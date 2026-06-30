import 'dotenv/config';
import fetch from 'node-fetch';

/**
 * Domain.com.au Developer API client — the free, official (non-scraping) default
 * data source for address sourcing. Replaces Apify for the free/MVP phase; Apify
 * stays documented in the README as a paid-tier option to swap back in once there
 * are paying clients who justify the per-result cost.
 *
 * NOTE: endpoint paths/payload shapes below are based on Domain's published API
 * pattern (OAuth2 client_credentials + Listings Search) but have NOT been verified
 * against a live response yet. Confirm with a real sandbox/live key and correct
 * field mappings the same way the Apify schema was corrected from a live sample.
 *
 * Sign up: https://developer.domain.com.au -> create an app -> get Client ID/Secret.
 */

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;

  const clientId = process.env.DOMAIN_CLIENT_ID;
  const clientSecret = process.env.DOMAIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('DOMAIN_CLIENT_ID/DOMAIN_CLIENT_SECRET not set — required for Domain.com.au API.');
  }

  const res = await fetch('https://auth.domain.com.au/v1/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'api_listings_read'
    })
  });

  if (!res.ok) throw new Error(`Domain auth failed (${res.status}): ${await res.text()}`);

  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh a minute early so we never call the search endpoint with a stale token.
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

/**
 * Searches Domain's residential listings for a given suburb/state, house only.
 * Returns the raw Domain listing objects — callers normalize fields downstream
 * (same pattern used for the Apify actor output).
 */
export async function searchListings({ suburb, state = 'QLD', postcode, pageSize = 50 }) {
  const token = await getAccessToken();

  const res = await fetch('https://api.domain.com.au/v1/listings/residential/_search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      listingType: 'Sale',
      propertyTypes: ['House'],
      locations: [
        {
          state,
          suburb,
          postCode: postcode ? String(postcode) : undefined,
          includeSurroundingSuburbs: false
        }
      ],
      pageSize
    })
  });

  if (!res.ok) throw new Error(`Domain search failed (${res.status}): ${await res.text()}`);

  return res.json();
}
