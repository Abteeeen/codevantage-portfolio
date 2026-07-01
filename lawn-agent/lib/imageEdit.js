import fetch from 'node-fetch';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const RENDER_PROMPT =
  'Replace the dead or patchy brown lawn with a lush, thick, evenly green healthy lawn. ' +
  'Keep the house, driveway, trees, fencing and all other elements identical. ' +
  'Photoreal satellite top-down view, same lighting and perspective.';

/**
 * Sends the satellite crop to an image-edit model and returns the rendered PNG.
 * Prefers OpenRouter (google/gemini-2.5-flash-image) when OPENROUTER_API_KEY is set,
 * falls back to OpenAI gpt-image-1 edits endpoint.
 * @param {Buffer} imageBuffer - original satellite JPEG/PNG
 * @returns {Promise<Buffer>} edited PNG bytes
 */
export async function renderLushLawn(imageBuffer) {
  if (OPENROUTER_API_KEY) return renderViaOpenRouter(imageBuffer);
  if (OPENAI_API_KEY) return renderViaOpenAI(imageBuffer);
  throw new Error('Set OPENROUTER_API_KEY or OPENAI_API_KEY to enable lawn rendering.');
}

async function renderViaOpenRouter(imageBuffer) {
  const b64 = imageBuffer.toString('base64');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: RENDER_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }
        ]
      }]
    })
  });

  if (!res.ok) throw new Error(`OpenRouter render failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const imgUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imgUrl) throw new Error(`No image in OpenRouter response: ${JSON.stringify(data)}`);
  const base64 = imgUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

async function renderViaOpenAI(imageBuffer) {
  const { default: FormData } = await import('form-data');
  const form = new FormData();
  form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  form.append('image', imageBuffer, { filename: 'lawn.png', contentType: 'image/png' });
  form.append('prompt', RENDER_PROMPT);
  form.append('size', '1024x1024');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form
  });

  if (!res.ok) throw new Error(`OpenAI image edit failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return Buffer.from(data.data[0].b64_json, 'base64');
}
