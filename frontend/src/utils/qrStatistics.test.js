import { statisticsText, countValues } from './qrStatistics';
const record = rows => ({ __sourceRows: JSON.stringify(rows) });
const settings = { enabled: true, columns: ['Nature', 'Année'], excluded: {} };
test('counts per box and per column, preserving repeated rows', () => {
  const box496 = record([{ Nature: 'Caution', Année: '2021' }, { Nature: 'Caution', Année: '2022' }, { Nature: 'Crédit', Année: '2022' }]);
  expect(statisticsText(box496, settings)).toContain('• Caution : 2');
  expect(statisticsText(box496, settings)).toContain('• 2022 : 2');
  expect(statisticsText(record([{ Nature: 'Caution' }]), settings)).toContain('• Caution : 1');
  expect(statisticsText(box496, { ...settings, excluded: { Nature: ['Caution'] } })).not.toContain('• Caution');
  expect(statisticsText(box496, { ...settings, enabled: false })).toBe('');
  expect(box496.__sourceRows).toContain('Caution');
});
test('does not guess counts from aggregated values, preserves complete cells and empty values', () => {
  expect(statisticsText({ Nature: 'Caution, Crédit' }, settings)).toContain('indisponibles');
  expect(countValues([{ Nature: 'Caution, Crédit' }, { Nature: ' Caution, Crédit ' }, { Nature: null }], 'Nature')).toEqual([['', 1], ['Caution, Crédit', 2]]);
  expect(statisticsText(record([{ Nature: 'Caution' }]), { ...settings, excluded: { Nature: ['Caution'] } })).toBe('');
});
