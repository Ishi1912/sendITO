// The Campaign model has no `type` field at all, so "type distribution" isn't
// real stored data. This infers a rough category from the subject/content
// text using simple keyword rules - deterministic and disclosed as an
// estimate in the UI, not presented as ground truth.
const RULES = [
  { type: "Welcome", keywords: ["welcome", "get started", "thanks for joining", "thanks for signing up"] },
  { type: "Promotional", keywords: ["% off", "discount", "sale", "offer", "deal", "promo", "coupon", "free shipping"] },
  { type: "Re-engagement", keywords: ["miss you", "come back", "haven't heard", "we miss", "still interested", "win back"] },
  { type: "Newsletter", keywords: ["newsletter", "roundup", "monthly update", "this month", "digest", "update"] },
];

export function classifyCampaignType(subject = "", content = "") {
  const text = `${subject} ${content}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.type;
  }
  return "Other";
}
