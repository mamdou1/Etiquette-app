// Marge sous la capacité maximale en mode octets, correction M.
export const QR_BYTE_LIMIT = 2200;
export const MAX_QR_PARTS = 8;

const byteLength = (value: string) => new TextEncoder().encode(value).length;
const characterByteLength = (character: string) => {
  const codePoint = character.codePointAt(0) ?? 0;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
};

interface Boundary {
  offset: number;
  bytes: number;
}

interface ContentBoundaries {
  all: Boundary[];
  lineBreaks: Boundary[];
}

function contentBoundaries(value: string): ContentBoundaries {
  const all: Boundary[] = [{ offset: 0, bytes: 0 }];
  const lineBreaks: Boundary[] = [];
  let offset = 0;
  let bytes = 0;

  for (const character of value) {
    offset += character.length;
    bytes += characterByteLength(character);
    const boundary = { offset, bytes };
    all.push(boundary);
    if (character === "\n") lineBreaks.push(boundary);
  }

  return { all, lineBreaks };
}

function nearestInRange(
  boundaries: Boundary[],
  minimumBytes: number,
  maximumBytes: number,
  targetBytes: number,
): Boundary | undefined {
  let low = 0;
  let high = boundaries.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (boundaries[middle].bytes < targetBytes) low = middle + 1;
    else high = middle;
  }

  return [boundaries[low], boundaries[low - 1]]
    .filter(
      (boundary): boundary is Boundary =>
        Boolean(boundary && boundary.bytes >= minimumBytes && boundary.bytes <= maximumBytes),
    )
    .sort((left, right) => Math.abs(left.bytes - targetBytes) - Math.abs(right.bytes - targetBytes))[0];
}

function closestBoundary(
  boundaries: ContentBoundaries,
  minimumBytes: number,
  maximumBytes: number,
  targetBytes: number,
): Boundary | undefined {
  const closest = nearestInRange(boundaries.lineBreaks, minimumBytes, maximumBytes, targetBytes);
  const closestDistance = closest ? Math.abs(closest.bytes - targetBytes) : Number.POSITIVE_INFINITY;

  // Une ligne anormalement longue ne doit pas déséquilibrer fortement les QR.
  if (closest && closestDistance <= (maximumBytes - minimumBytes) * 0.35) return closest;
  return nearestInRange(boundaries.all, minimumBytes, maximumBytes, targetBytes);
}

function splitBalanced(boundaries: ContentBoundaries, value: string, capacity: number, totalParts: number): string[] {
  const parts: string[] = [];
  const totalBytes = boundaries.all[boundaries.all.length - 1].bytes;
  let previous = boundaries.all[0];

  for (let part = 0; part < totalParts - 1; part++) {
    const remainingParts = totalParts - part;
    const remainingBytes = totalBytes - previous.bytes;
    const targetBytes = previous.bytes + Math.round(remainingBytes / remainingParts);
    const minimumBytes = Math.max(previous.bytes + 1, totalBytes - capacity * (remainingParts - 1));
    const maximumBytes = Math.min(previous.bytes + capacity, totalBytes - (remainingParts - 1));
    const boundary = closestBoundary(boundaries, minimumBytes, maximumBytes, targetBytes);
    if (!boundary || boundary.offset <= previous.offset) return [];

    parts.push(value.slice(previous.offset, boundary.offset));
    previous = boundary;
  }

  const lastPart = value.slice(previous.offset);
  if (!lastPart || totalBytes - previous.bytes > capacity) return [];
  parts.push(lastPart);
  return parts;
}

function partHeader(boxNumber: string, part: number, total: number): string {
  return `BOÎTE : ${boxNumber}\nQR ${part}/${total} — Lire les QR dans l'ordre.\n\n`;
}

export function splitQrContent(value: string, boxNumber: string): { parts: string[]; error?: string } {
  const boundaries = contentBoundaries(value);
  const totalBytes = boundaries.all[boundaries.all.length - 1].bytes;
  if (totalBytes <= QR_BYTE_LIMIT) return { parts: [value] };

  for (let expectedParts = 2; expectedParts <= MAX_QR_PARTS; expectedParts++) {
    const largestHeader = Math.max(
      ...Array.from({ length: expectedParts }, (_, index) =>
        byteLength(partHeader(boxNumber, index + 1, expectedParts)),
      ),
    );
    const capacity = QR_BYTE_LIMIT - largestHeader;
    if (capacity <= 0) break;

    if (totalBytes <= capacity * expectedParts) {
      const bodies = splitBalanced(boundaries, value, capacity, expectedParts);
      if (bodies.length !== expectedParts) continue;
      const total = expectedParts;
      return {
        parts: bodies.map((body, index) => partHeader(boxNumber, index + 1, total) + body),
      };
    }
  }

  return {
    parts: [],
    error: `Le contenu complet dépasse la capacité de ${MAX_QR_PARTS} QR. Aucune information n’a été coupée : réduisez le nombre de colonnes associées ou de statistiques.`,
  };
}
