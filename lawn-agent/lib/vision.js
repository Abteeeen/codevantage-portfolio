import fetch from 'node-fetch';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_VISION_MODEL || 'google/gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a property lawn-condition assessor for a lawn care lead-generation system.
Given a top-down satellite image of a residential property, return ONLY a JSON object:
{
  "lawnCondition": "dead" | "patchy" | "healthy" | "no-visible-lawn",
  "lawnConfidence": 0-1,
  "houseQualityTier": "A" | "B" | "C",
  "standaloneHouse": true | false,
  "reasoning": "one short sentence"
}
"dead" = significant brown/yellow turf coverage. "houseQualityTier" A = larger/well-maintained home (higher likelihood owner can pay for landscaping), C = smaller/lower-value. Be conservative — only mark "dead" if clearly visible from above.`;

/**
 * Scores a satellite image for lawn condition + house quality using a vision-capable LLM via OpenRouter.
 * @param {Buffer} imageBuffer
 * @returns {Promise<object>} classification result
 */
export async function classifyLawn(imageBuffer) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set — https://openrouter.ai/keys');

  const base64 = imageBuffer.toString('base64');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Classify this property.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!res.ok) throw new Error(`OpenRouter vision call failed (${res.status}): ${await res.text()}`);

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}
