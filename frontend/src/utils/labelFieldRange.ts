export function joinLabelFieldRange(
  fields: Array<{ name: string; value: string }>,
  range: { enabled: boolean; from: string; to: string },
) {
  const from = fields.find(field => field.name === range.from);
  const to = fields.find(field => field.name === range.to);
  if (!range.enabled || range.from === range.to || !from?.value || !to?.value) return fields;
  return fields.filter(field => field.name !== range.to).map(field =>
    field.name === range.from ? { ...field, value: `${from.value} à ${to.value}` } : field,
  );
}
