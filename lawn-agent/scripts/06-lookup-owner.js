import 'dotenv/config';

/**
 * Owner-name lookup. Queensland has no free public title-owner database
 * (unlike NSW's free Registrar General title search), so this stage is a
 * pluggable stub — wire it up to whichever source fits your budget:
 *
 *  - Paid QLD title search via a provider (Landgate-equivalent, InfoTrack, etc.)
 *    — recommended ONLY for the single top-ranked lead per run, not the full scan,
 *    since it costs ~$15-20/property.
 *  - Real-estate listing data (Domain/realestate.com.au "sold" history) as a free
 *    but less reliable fallback when the property has sold/listed recently.
 *
 * This stub returns a placeholder so the rest of the pipeline can run end-to-end
 * without a paid lookup wired in yet.
 */
export async function lookupOwner(lead) {
  if (process.env.TITLE_SEARCH_PROVIDER_URL && process.env.TITLE_SEARCH_API_KEY) {
    const res = await fetch(process.env.TITLE_SEARCH_PROVIDER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TITLE_SEARCH_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address: lead.address, state: 'QLD' })
    });
    if (res.ok) {
      const data = await res.json();
      return { ...lead, ownerName: data.ownerName, ownerFirstName: data.firstName };
    }
    console.warn('[06-lookup-owner] Title search provider call failed, falling back to placeholder.');
  }

  console.warn('[06-lookup-owner] No title search provider configured — using "Homeowner" placeholder. See README owner-lookup note.');
  return { ...lead, ownerName: 'Homeowner', ownerFirstName: null };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  lookupOwner({ address: '12 Bullard St, Bardon QLD' }).then((r) => console.log(r));
}
