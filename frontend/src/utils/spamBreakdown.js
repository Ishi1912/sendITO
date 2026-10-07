// The /api/ai/spam-check response includes a `breakdown` object with the raw
// signals (counts/flags) but not a per-category point total. Since we know
// the exact weights used server-side (spam.service.js), we can faithfully
// reconstruct how many of the ruleScore's points came from each category -
// this is arithmetic on real numbers the API returned, not an estimate.
export function computeRiskBreakdown(breakdown) {
  if (!breakdown) return [];

  const promotional = Math.min((breakdown.promotionalWords?.length || 0) * 5, 20);
  const urgency = Math.min((breakdown.urgencyWords?.length || 0) * 5, 15);
  const suspicious = Math.min((breakdown.suspiciousPhrases?.length || 0) * 10, 25);
  const uppercase = breakdown.uppercasePercentage > 40 ? 15 : 0;
  const exclamation = breakdown.exclamationCount >= 3 ? 10 : 0;
  const links = breakdown.linkCount >= 3 ? 10 : 0;
  const currency = breakdown.currencySymbolCount >= 3 ? 5 : 0;
  const repeated = breakdown.repeatedCharacters ? 5 : 0;

  return [
    { label: "Promotional", value: promotional, color: "#FF6859" },
    { label: "Urgency", value: urgency + suspicious, color: "#F5B84E" },
    { label: "Formatting", value: uppercase + exclamation + repeated, color: "#F5B84E" },
    { label: "Links & currency", value: links + currency, color: "#8C6BFF" },
  ].filter((b) => b.value > 0);
}

const HIGH_KEYWORDS = ["promotional language", "suspicious phrases"];
const MEDIUM_KEYWORDS = ["urgency-related", "capital letters"];

export function classifyIssueSeverity(issueText) {
  const lower = issueText.toLowerCase();
  if (HIGH_KEYWORDS.some((k) => lower.includes(k))) return "High";
  if (MEDIUM_KEYWORDS.some((k) => lower.includes(k))) return "Medium";
  return "Low";
}
