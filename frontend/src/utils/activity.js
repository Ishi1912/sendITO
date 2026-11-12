import { dateFromObjectId } from "./objectId";

const BUCKET_SECONDS = 5; // subscribers created within 5s of each other are treated as one CSV import

/**
 * Produces a chronological list of real events derived from actual data:
 * - subscriber creation (via the timestamp embedded in Mongo's _id, since the
 *   Subscriber schema has no createdAt field of its own) - clustered into a
 *   single "CSV imported" event when several land in the same few seconds
 * - campaign creation, scheduling, sending, and cancellation (all backed by
 *   real createdAt/updatedAt/sentAt fields)
 *
 * Nothing here is invented: if the data can't tell us something happened
 * (e.g. exactly when a subscriber unsubscribed - that schema has no
 * timestamps at all), we simply don't emit an event for it.
 */
export function buildActivityFeed(subscribers = [], campaigns = [], limit = 20) {
  const events = [];

  // --- subscribers, bucketed to detect CSV imports vs single adds ---
  const buckets = new Map();
  for (const s of subscribers) {
    const created = dateFromObjectId(s._id);
    if (!created) continue;
    const bucketKey = Math.floor(created.getTime() / 1000 / BUCKET_SECONDS);
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey).push({ ...s, _createdAt: created });
  }
  for (const group of buckets.values()) {
    const earliest = group.reduce((a, b) => (a._createdAt < b._createdAt ? a : b));
    if (group.length > 1) {
      events.push({
        id: `import-${earliest._id}`,
        type: "import",
        title: `CSV imported (${group.length} subscribers)`,
        date: earliest._createdAt,
      });
    } else {
      events.push({
        id: `add-${earliest._id}`,
        type: "subscriber_added",
        title: `New subscriber added`,
        subtitle: earliest.name || earliest.email,
        date: earliest._createdAt,
      });
    }
  }

  // --- campaigns ---
  for (const c of campaigns) {
    if (c.createdAt) {
      events.push({
        id: `created-${c._id}`,
        type: "campaign_draft",
        title: `Campaign "${c.subject}" saved as draft`,
        date: new Date(c.createdAt),
      });
    }
    if (c.sentAt) {
      events.push({
        id: `sent-${c._id}`,
        type: "campaign_sent",
        title: `Campaign "${c.subject}" was sent`,
        date: new Date(c.sentAt),
      });
    }
    if (c.status === "scheduled" && c.scheduledAt) {
      events.push({
        id: `scheduled-${c._id}`,
        type: "campaign_scheduled",
        title: `Campaign "${c.subject}" scheduled`,
        date: new Date(c.updatedAt || c.createdAt),
      });
    }
    if (c.status === "cancelled") {
      events.push({
        id: `cancelled-${c._id}`,
        type: "campaign_cancelled",
        title: `Campaign "${c.subject}" cancelled`,
        date: new Date(c.updatedAt || c.createdAt),
      });
    }
  }

  return events
    .filter((e) => e.date && !Number.isNaN(e.date.getTime()))
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
}
