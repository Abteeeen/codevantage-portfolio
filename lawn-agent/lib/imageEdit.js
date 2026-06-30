import fetch from 'node-fetch';
import FormData from 'form-data';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

const RENDER_PROMPT =
  'Edit this satellite photo of a residential property. Replace the dead, brown, patchy front lawn ' +
  'with a lush, even, healthy green lawn — same mowing pattern style, same shadows and lighting as the ' +
  'original. Do not change the house, driveway, trees, roof, or any other element. Photoreal result, ' +
  'top-down satellite perspective preserved exactly.';

/**
 * Sends the dead-lawn satellite crop to an image-edit model and returns the
 * "lush green" render used for the before/after postcard.
 * @param {Buffer} imageBuffer - original satellite JPEG/PNG
 * @returns {Promise<Buffer>} edited PNG bytes
 */
export async function renderLushLawn(imageBuffer) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set — https://platform.openai.com/api-keys');

  const form = new FormData();
  form.append('model', MODEL);
  form.append('image', imageBuffer, { filename: 'lawn.png', contentType: 'image/png' });
  form.append('prompt', RENDER_PROMPT);
  form.append('size', '1024x1024');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form
  });

  if (!res.ok) throw new Error(`Image edit failed (${res.status}): ${await res.text()}`);

  const data = await res.json();
  return Buffer.from(data.data[0].b64_json, 'base64');
}
