import 'dotenv/config';
import { sendPostcard } from '../lib/postgrid.js';

/**
 * Final stage — dispatches the postcard via PostGrid.
 */
export async function dispatchPostcard(postcardPayload) {
  const result = await sendPostcard(postcardPayload);
  console.log(`[08-send-postcard] Sent. PostGrid id: ${result.id}, status: ${result.status}`);
  return result;
}
