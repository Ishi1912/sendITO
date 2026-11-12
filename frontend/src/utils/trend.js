const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Given real event dates (e.g. when each subscriber was created, or each
 * campaign was sent), returns a 7-day daily-count sparkline and a genuine
 * week-over-week percentage change. No numbers here are invented - if there's
 * not enough history, deltaLabel says so instead of showing a made-up figure.
 */
export function buildTrend(dates, days = 7) {
  const valid = dates.filter(Boolean).map((d) => (d instanceof Date ? d : new Date(d)));
  const now = Date.now();

  const daily = new Array(days).fill(0);
  for (const d of valid) {
    const daysAgo = Math.floor((now - d.getTime()) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < days) {
      daily[days - 1 - daysAgo] += 1;
    }
  }

  const lastN = valid.filter((d) => now - d.getTime() <= days * DAY_MS).length;
  const prevN = valid.filter((d) => {
    const age = now - d.getTime();
    return age > days * DAY_MS && age <= 2 * days * DAY_MS;
  }).length;

  let deltaLabel = `No activity in the last ${days} days`;
  let deltaPositive = true;

  if (prevN === 0 && lastN === 0) {
    deltaLabel = `No activity in the last ${days} days`;
  } else if (prevN === 0) {
    deltaLabel = `+${lastN} in the last ${days} days`;
  } else {
    const pct = ((lastN - prevN) / prevN) * 100;
    deltaPositive = pct >= 0;
    deltaLabel = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% from last ${days} days`;
  }

  return { daily, deltaLabel, deltaPositive, lastN };
}
