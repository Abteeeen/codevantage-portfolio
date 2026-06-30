import 'dotenv/config';
import fetch from 'node-fetch';

/**
 * The Apify real-estate actor doesn't return lat/lng, so we geocode the
 * full address ourselves using Mapbox's Geocoding API — same free token
 * already used for satellite imagery, no extra account needed.
 */
export async function geocodeAddress(fullAddress) {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
  if (!MAPBOX_TOKEN) throw new Error('MAPBOX_TOKEN not set — required for geocoding.');

  const query = encodeURIComponent(`${fullAddress}, Australia`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=au&limit=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox geocoding failed (${res.status}): ${await res.text()}`);

  const data = await res.json();
  const match = data.features?.[0];
  if (!match) return null;

  const [lng, lat] = match.center;
  return { lat, lng };
}
