import { TextEncoder } from "util";
import { MAX_QR_PARTS, QR_BYTE_LIMIT, splitQrContent } from "./qrParts";

global.TextEncoder = TextEncoder;

function body(part) {
  return part.slice(part.indexOf("\n\n") + 2);
}

test("splits long content across as many numbered QR parts as needed without data loss", () => {
  const value = Array.from({ length: 180 }, (_, index) =>
    `• Dossier ${index + 1} : montant ${index * 12345} €`,
  ).join("\n");
  const result = splitQrContent(value, "10");
  expect(result.error).toBeUndefined();
  expect(result.parts.length).toBeGreaterThan(2);
  expect(result.parts.length).toBeLessThanOrEqual(MAX_QR_PARTS);
  expect(result.parts.every((part) => new TextEncoder().encode(part).length <= QR_BYTE_LIMIT)).toBe(true);
  expect(result.parts.map(body).join("")).toBe(value);
  result.parts.forEach((part, index) => {
    expect(part).toContain(`QR ${index + 1}/${result.parts.length}`);
  });

  const sizes = result.parts.map((part) => new TextEncoder().encode(body(part)).length);
  const average = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
  expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(average * 0.15);
});

test("balances two QR parts instead of filling the first one to its limit", () => {
  const value = Array.from({ length: 100 }, (_, index) =>
    `• Nature ${index + 1} : montant ${(index + 1) * 100000}`,
  ).join("\n");
  const result = splitQrContent(value, "10");
  expect(result.parts).toHaveLength(2);
  expect(result.parts.map(body).join("")).toBe(value);

  const sizes = result.parts.map((part) => new TextEncoder().encode(body(part)).length);
  expect(Math.abs(sizes[0] - sizes[1])).toBeLessThan(100);
});

test("returns an explicit error instead of truncating content beyond the safety limit", () => {
  const value = "Information très longue\n".repeat(5000);
  const result = splitQrContent(value, "999");
  expect(result.parts).toEqual([]);
  expect(result.error).toContain(`${MAX_QR_PARTS} QR`);
});
