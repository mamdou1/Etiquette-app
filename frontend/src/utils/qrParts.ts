// Marge sous la capacité maximale en mode octets, correction M.
export const QR_BYTE_LIMIT = 2200;
const byteLength = (value: string) => new TextEncoder().encode(value).length;
const characterByteLength = (character: string) => {
  const codePoint = character.codePointAt(0) ?? 0;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
};

export function splitQrContent(value: string, boxNumber: string): { parts: string[]; error?: string } {
  if (byteLength(value) <= QR_BYTE_LIMIT) return { parts: [value] };
  const headers = [1, 2].map(part => `BOÎTE : ${boxNumber}\nQR ${part}/2 — Lire les deux QR dans l'ordre.\n\n`);
  const capacity = QR_BYTE_LIMIT - Math.max(...headers.map(byteLength));
  const total = byteLength(value);
  if (capacity <= 0 || total > capacity * 2) {
    return { parts: [], error: 'Le contenu complet dépasse la capacité de deux QR. Aucune information n’a été coupée : cette étiquette nécessite un autre mode de consultation.' };
  }
  let bytes = 0;
  let offset = 0;
  let split = 0;
  let distance = Infinity;
  // Couper entre deux caractères Unicode, de préférence entre deux lignes.
  let lineSplit = 0;
  let lineDistance = Infinity;
  for (const char of value) {
    bytes += characterByteLength(char);
    offset += char.length;
    if (bytes > capacity || total - bytes > capacity) continue;
    const delta = Math.abs(total / 2 - bytes);
    if (delta < distance) { split = offset; distance = delta; }
    if (char === '\n' && delta < lineDistance) { lineSplit = offset; lineDistance = delta; }
  }
  split = lineSplit || split;
  if (!split) return { parts: [], error: 'Impossible de répartir ce contenu dans deux QR sans perte.' };
  return { parts: [headers[0] + value.slice(0, split), headers[1] + value.slice(split)] };
}
