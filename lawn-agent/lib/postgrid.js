import fetch from 'node-fetch';

const POSTGRID_API_KEY = process.env.POSTGRID_API_KEY;
const POSTGRID_BASE = 'https://api.postgrid.com/print-mail/v1';

/**
 * Creates and sends a postcard via PostGrid (confirmed AU postcard support).
 * https://www.postgrid.com/
 *
 * @param {object} params
 * @param {string} params.toName - property owner name
 * @param {object} params.toAddress - { addressLine1, city, provinceOrState, postalOrZip, countryCode: 'AU' }
 * @param {string} params.frontImageUrl - publicly accessible URL of the before/after render
 * @param {string} params.backHtml - HTML template for the postcard back (message + QR code)
 */
export async function sendPostcard({ toName, toAddress, frontImageUrl, backHtml }) {
  if (!POSTGRID_API_KEY) throw new Error('POSTGRID_API_KEY not set — https://www.postgrid.com/');

  const res = await fetch(`${POSTGRID_BASE}/postcards`, {
    method: 'POST',
    headers: {
      'x-api-key': POSTGRID_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: {
        firstName: toName,
        addressLine1: toAddress.addressLine1,
        city: toAddress.city,
        provinceOrState: toAddress.provinceOrState,
        postalOrZip: toAddress.postalOrZip,
        countryCode: toAddress.countryCode || 'AU'
      },
      from: {
        companyName: process.env.SENDER_COMPANY_NAME || 'Your Lawn Care Co',
        addressLine1: process.env.SENDER_ADDRESS_LINE1 || '',
        city: process.env.SENDER_CITY || '',
        provinceOrState: process.env.SENDER_STATE || 'QLD',
        postalOrZip: process.env.SENDER_POSTCODE || '',
        countryCode: 'AU'
      },
      size: '6x9',
      frontHTML: `<img src="${frontImageUrl}" style="width:100%;height:100%;object-fit:cover;" />`,
      backHTML: backHtml
    })
  });

  if (!res.ok) throw new Error(`PostGrid send failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/**
 * Builds the postcard back HTML: short pitch + QR code linking to a before/after video/landing page.
 */
export function buildPostcardBack({ ownerFirstName, suburb, qrUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 24px;">
      <p>Hi ${ownerFirstName || 'there'},</p>
      <p>We noticed your front lawn could use some attention. Here's what it could look like —
      we already rendered it for you (see front). We service ${suburb} weekly.</p>
      <p>Scan the code for a free quote, no obligation.</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" />
    </div>
  `;
}
