// Utility to parse, sort and group consecutive production dates.
// Input date format: "DD/MM/YYYY"

function parseDateDMY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year))
    return null;
  // Use UTC to avoid timezone offset issues when doing day arithmetic
  return new Date(Date.UTC(year, month, day));
}

function formatDateDMY(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

export function formatProductionDates(dates: string[]): string[] {
  if (!Array.isArray(dates)) return [];

  // Parse and keep unique timestamps (ms)
  const timestamps = dates
    .map(parseDateDMY)
    .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
    .map((d) => d.getTime())
    .sort((a, b) => a - b);

  const uniq: number[] = [];
  for (const t of timestamps) {
    if (uniq.length === 0 || uniq[uniq.length - 1] !== t) uniq.push(t);
  }

  const DAY = 24 * 60 * 60 * 1000;
  const ranges: string[] = [];

  let i = 0;
  while (i < uniq.length) {
    let start = uniq[i];
    let end = start;
    let j = i + 1;
    while (j < uniq.length && uniq[j] - end === DAY) {
      end = uniq[j];
      j += 1;
    }

    if (start === end) {
      ranges.push(formatDateDMY(new Date(start)));
    } else {
      ranges.push(
        `${formatDateDMY(new Date(start))} → ${formatDateDMY(new Date(end))}`,
      );
    }

    i = j;
  }

  return ranges;
}

export default formatProductionDates;
