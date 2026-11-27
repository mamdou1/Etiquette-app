import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { TextEncoder } from 'util';
import { SettingsProvider } from '../contexts/SettingsContext';
import QrStatisticsPanel from './QrStatisticsPanel';
import LabelCard from './LabelCard';
global.TextEncoder = TextEncoder;
global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('qrcode.react', () => ({ QRCodeSVG: props => <svg data-value={props.value} /> }));
test('selecting multiple columns appends statistics; exclusions and disabling preserve the original QR', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const record = { numero_boite: '496', Nature: 'Caution, Crédit', Année: '2021', __sourceRows: JSON.stringify([{ Nature: 'Caution', Année: '2021' }, { Nature: 'Crédit', Année: '2021' }]) };
  const qr = () => container.querySelector('svg[data-value]').getAttribute('data-value');
  const toggle = text => {
    const label = Array.from(container.querySelectorAll('label')).filter(label => label.textContent.trim() === text).at(-1);
    const input = label.querySelector('input');
    act(() => Simulate.change(input, { target: { checked: !input.checked } }));
  };
  try {
    act(() => root.render(<SettingsProvider><QrStatisticsPanel records={[record]} /><LabelCard record={record} allFields={['Nature', 'Année']} visibleFields={['Nature']} boxNumber="496" size="md" /></SettingsProvider>));
    const original = qr();
    const enabled = container.querySelector('[aria-label="Ajouter les statistiques au QR"]');
    act(() => Simulate.change(enabled, { target: { checked: true } }));
    toggle('Nature'); toggle('Année');
    expect(qr().startsWith(original)).toBe(true);
    expect(qr()).toContain('• Caution : 1'); expect(qr()).toContain('• 2021 : 2');
    toggle('Caution');
    expect(qr()).not.toContain('• Caution : 1'); expect(qr()).toContain('Caution, Crédit');
    act(() => Simulate.change(enabled, { target: { checked: false } }));
    expect(qr()).toBe(original);
  } finally { act(() => root.unmount()); container.remove(); }
});
test('selecting several value fields adds row-by-row correspondence and preserves general information', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const record = {
    numero_boite: '10', Agence: 'Agence Centrale', Nature: 'Caution de démarrage, Caution de bonne exécution', Montant: '2674212, 11242063', Date: '24/01/2019, 08/10/2021', Compte: '400003000820, 400001234567',
    __sourceRows: JSON.stringify([
      { Nature: 'Caution de démarrage', Montant: '2674212', Date: '24/01/2019', Compte: '400003000820' },
      { Nature: 'Caution de bonne exécution', Montant: '11242063', Date: '08/10/2021', Compte: '400001234567' },
    ]),
  };
  const qr = () => container.querySelector('svg[data-value]').getAttribute('data-value');
  try {
    act(() => root.render(<SettingsProvider><QrStatisticsPanel records={[record]} /><LabelCard record={record} allFields={['Agence', 'Nature', 'Montant', 'Date', 'Compte']} visibleFields={['Agence', 'Nature', 'Montant', 'Date', 'Compte']} boxNumber="10" size="md" /></SettingsProvider>));
    const pairing = container.querySelector('[aria-label="Associer deux champs dans le QR"]');
    act(() => Simulate.change(pairing, { target: { checked: true } }));
    const labelField = container.querySelector('[aria-label="Champ libellé de la correspondance"]');
    act(() => Simulate.change(labelField, { target: { value: 'Nature' } }));
    ['Montant', 'Date', 'Compte'].forEach(value => {
      const checkbox = container.querySelector(`input[value="${value}"]`);
      act(() => Simulate.change(checkbox, { target: { checked: true } }));
    });
    expect(qr()).toContain('Nature : Montant, Date, Compte');
    expect(qr()).toContain('• Caution de démarrage\n  - Montant : 2 674 212\n  - Date : 24/01/2019\n  - Compte : 400003000820');
    expect(qr()).toContain('• Caution de bonne exécution\n  - Montant : 11 242 063');
    expect(qr()).toContain('• N° Boîte : 10');
    expect(qr()).toContain('• Service Producteur : Agence Centrale');
    expect(qr()).not.toContain('• Nature : Caution de démarrage, Caution de bonne exécution');
  } finally { act(() => root.unmount()); container.remove(); }
});

test('globally hidden columns disappear from general information, pairing and statistics', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const record = {
    numero_boite: '10', Nature: 'Caution', Montant: '2674212', Date: '24/01/2019',
    __sourceRows: JSON.stringify([{ Nature: 'Caution', Montant: '2674212', Date: '24/01/2019' }]),
  };
  const qr = () => container.querySelector('svg[data-value]').getAttribute('data-value');
  const toggle = text => {
    const labels = Array.from(container.querySelectorAll('label')).filter(label => label.textContent.trim() === text);
    const input = labels[0].querySelector('input');
    act(() => Simulate.change(input, { target: { checked: !input.checked } }));
  };
  try {
    act(() => root.render(<SettingsProvider><QrStatisticsPanel records={[record]} /><LabelCard record={record} allFields={['Nature', 'Montant', 'Date']} visibleFields={['Nature', 'Montant', 'Date']} boxNumber="10" size="md" /></SettingsProvider>));
    expect(qr()).toContain('• Montant : 2674212');
    toggle('Montant');
    expect(qr()).not.toContain('Montant');
    expect(qr()).toContain('• Nature : Caution');
    toggle('Nature');
    expect(qr()).not.toContain('Nature');
    expect(qr()).toContain('• Date : 24/01/2019');
  } finally { act(() => root.unmount()); container.remove(); }
});

test('grouped statistic fields are not repeated in general QR information', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const record = {
    numero_boite: '7', Client: 'Orange Mali, Malitel', Numero: '100, 200', Compte: '001, 002', Nature: 'Caution, Soumission', Agence: 'Agence Centrale',
    __sourceRows: JSON.stringify([
      { Client: 'Orange Mali', Numero: '100', Compte: '001', Nature: 'Caution', Agence: 'Agence Centrale' },
      { Client: 'Malitel', Numero: '200', Compte: '002', Nature: 'Soumission', Agence: 'Agence Centrale' },
    ]),
  };
  const qr = () => container.querySelector('svg[data-value]').getAttribute('data-value');
  try {
    act(() => root.render(<SettingsProvider><QrStatisticsPanel records={[record]} /><LabelCard record={record} allFields={['Client', 'Numero', 'Compte', 'Nature', 'Agence']} visibleFields={['Client', 'Numero', 'Compte', 'Nature', 'Agence']} boxNumber="7" size="md" /></SettingsProvider>));
    act(() => Simulate.change(container.querySelector('[aria-label="Ajouter les statistiques groupées au QR"]'), { target: { checked: true } }));
    act(() => Simulate.change(container.querySelector('[aria-label="Colonne principale des statistiques groupées"]'), { target: { value: 'Client' } }));
    act(() => Simulate.change(container.querySelector('[aria-label="Identifiant complémentaire Numero"]'), { target: { checked: true } }));
    act(() => Simulate.change(container.querySelector('[aria-label="Identifiant complémentaire Compte"]'), { target: { checked: true } }));
    act(() => Simulate.change(container.querySelector('[aria-label="Colonne à compter dans les statistiques groupées"]'), { target: { value: 'Nature' } }));
    expect(qr()).not.toContain('• Client : Orange Mali, Malitel');
    expect(qr()).not.toContain('• Numero : 100, 200');
    expect(qr()).not.toContain('• Compte : 001, 002');
    expect(qr()).not.toContain('• Nature : Caution, Soumission');
    expect(qr()).toContain('• Service Producteur : Agence Centrale');
    expect(qr()).toContain('STATISTIQUES PAR CLIENT');
    expect(qr()).toContain('• ORANGE MALI\n  - Numero : 100\n  - Compte : 001\n  - Caution : 1');
  } finally { act(() => root.unmount()); container.remove(); }
});
