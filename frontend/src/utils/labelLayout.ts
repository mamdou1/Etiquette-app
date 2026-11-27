export function getLabelLayout(count: number, layout: 'auto' | 'row') {
  const rows = layout === 'row' || count <= 3 ? 1 : 2;
  return { columns: Math.ceil(count / rows), rows };
}
