/**
 * Ranks classified properties and selects the single best lead to pitch:
 * dead lawn + standalone house + highest house-quality tier = most likely to
 * both need landscaping AND be able to pay for it.
 */
const TIER_SCORE = { A: 3, B: 2, C: 1 };
const CONDITION_SCORE = { dead: 3, patchy: 1.5, healthy: 0, 'no-visible-lawn': -10 };

export function rankLeads(classifiedAddresses) {
  const scored = classifiedAddresses
    .filter((a) => a.standaloneHouse !== false)
    .map((a) => ({
      ...a,
      score:
        (CONDITION_SCORE[a.lawnCondition] ?? 0) * (a.lawnConfidence ?? 1) +
        (TIER_SCORE[a.houseQualityTier] ?? 0)
    }))
    .sort((a, b) => b.score - a.score);

  return scored;
}

export function topLead(classifiedAddresses) {
  return rankLeads(classifiedAddresses)[0] || null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('fs');
  const classified = JSON.parse(readFileSync('output/classified.json', 'utf-8'));
  console.log(JSON.stringify(rankLeads(classified), null, 2));
}
