// A MongoDB ObjectId's first 4 bytes are a real Unix timestamp (seconds) of
// when the document was inserted. The Subscriber schema in this backend was
// not defined with `{ timestamps: true }`, so there's no createdAt field -
// but we can still recover a genuine creation time from `_id` itself instead
// of inventing one.
export function dateFromObjectId(id) {
  if (!id || typeof id !== "string" || id.length < 8) return null;
  const seconds = parseInt(id.substring(0, 8), 16);
  if (Number.isNaN(seconds)) return null;
  return new Date(seconds * 1000);
}

export function formatRelativeTime(date) {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatShortDate(date) {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
