import { statisticsText, countValues, groupedStatisticsText, pairingText } from './qrStatistics';
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
test('pairs one label with multiple values from the same source row', () => {
  const box = record([
    { Nature: 'Caution de démarrage', Montant: '2674212', Date: '24/01/2019', Compte: '400003000820' },
    { Nature: 'Caution de bonne exécution', Montant: '11242063', Date: '08/10/2021', Compte: '400001234567' },
  ]);
  const paired = pairingText(box, {
    ...settings,
    pairingEnabled: true,
    pairingLabelField: 'Nature',
    pairingValueFields: ['Montant', 'Date', 'Compte'],
  });
  expect(paired).toContain('Nature : Montant, Date, Compte');
  expect(paired).toContain('• Caution de démarrage\n  - Montant : 2 674 212\n  - Date : 24/01/2019\n  - Compte : 400003000820');
  expect(paired).toContain('• Caution de bonne exécution\n  - Montant : 11 242 063');
});
test('globally hidden columns are removed from pairing and statistics', () => {
  const box = record([{ Nature: 'Caution', Montant: '2674212', Date: '24/01/2019' }]);
  const hidden = {
    ...settings,
    hiddenColumns: ['Montant', 'Année'],
    pairingEnabled: true,
    pairingLabelField: 'Nature',
    pairingValueFields: ['Montant', 'Date'],
  };
  expect(pairingText(box, hidden)).toContain('Nature : Date');
  expect(pairingText(box, hidden)).not.toContain('Montant');
  expect(statisticsText(box, hidden)).not.toContain('Année');
});
test('groups category counts by client name and number within one box', () => {
  const box = record([
    { Client: 'Orange Mali', Numero: '100', Compte: '001', Nature: 'Caution' },
    { Client: 'Orange Mali', Numero: '100', Compte: '001', Nature: 'Caution' },
    { Client: 'Orange Mali', Numero: '100', Compte: '001', Nature: 'Soumission' },
    { Client: 'Malitel', Numero: '200', Compte: '002', Nature: 'Caution' },
  ]);
  const result = groupedStatisticsText(box, {
    ...settings,
    groupedEnabled: true,
    groupedPrimaryField: 'Client',
    groupedSecondaryFields: ['Numero', 'Compte'],
    groupedValueField: 'Nature',
  }, [{ name: 'Client', label: 'Nom Client' }, { name: 'Numero', label: 'Numéro Client' }]);
  expect(result).toContain('STATISTIQUES PAR NOM CLIENT');
  expect(result).toContain('• ORANGE MALI\n  - Numéro Client : 100\n  - Compte : 001');
  expect(result).toContain('  - Caution : 2');
  expect(result).toContain('  - Soumission : 1');
  expect(result).toContain('• MALITEL\n  - Numéro Client : 200\n  - Compte : 002\n  - Caution : 1');
});
