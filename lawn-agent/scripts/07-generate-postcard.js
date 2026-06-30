import { buildPostcardBack } from '../lib/postgrid.js';

/**
 * Assembles the postcard payload (front render reference + back HTML) ready
 * to hand to PostGrid in stage 08. Splits this out so the front image can be
 * uploaded to wherever you host public assets (S3, Cloudflare R2, etc.) before
 * dispatch, since PostGrid needs a public image URL, not raw bytes.
 */
export function generatePostcard(lead, { publicRenderUrl, landingPageUrl }) {
  const backHtml = buildPostcardBack({
    ownerFirstName: lead.ownerFirstName,
    suburb: lead.suburb,
    qrUrl: landingPageUrl
  });

  return {
    toName: lead.ownerName,
    toAddress: {
      addressLine1: lead.address,
      city: lead.suburb,
      provinceOrState: 'QLD',
      postalOrZip: String(lead.postcode),
      countryCode: 'AU'
    },
    frontImageUrl: publicRenderUrl,
    backHtml
  };
}
