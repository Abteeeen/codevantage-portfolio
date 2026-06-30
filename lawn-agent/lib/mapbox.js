import fetch from 'node-fetch';

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

/**
 * Pulls a satellite image centered on a lat/lng using Mapbox's Static Images API.
 * Free tier: 50,000 requests/month — https://docs.mapbox.com/api/maps/static-images/
 *
 * @param {number} lat
 * @param {number} lng
 * @param {object} opts - { zoom = 19, width = 600, height = 400 }
 * @returns {Promise<Buffer>} image bytes (JPEG)
 */
export async function fetchSatelliteImage(lat, lng, opts = {}) {
  if (!MAPBOX_TOKEN) throw new Error('MAPBOX_TOKEN not set — get one free at https://account.mapbox.com/access-tokens/');

  const { zoom = 19, width = 600, height = 400 } = opts;
  const url =
    `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/` +
    `${lng},${lat},${zoom},0,0/${width}x${height}@2x` +
    `?access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mapbox fetch failed (${res.status}): ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
