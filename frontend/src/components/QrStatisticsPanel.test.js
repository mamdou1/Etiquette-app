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
    const label = Array.from(container.querySelectorAll('label')).find(label => label.textContent.trim() === text);
    const input = label.querySelector('input');
    act(() => Simulate.change(input, { target: { checked: !input.checked } }));
  };
  try {
    act(() => root.render(<SettingsProvider><QrStatisticsPanel records={[record]} /><LabelCard record={record} allFields={['Nature', 'Année']} visibleFields={['Nature']} boxNumber="496" size="md" /></SettingsProvider>));
    const original = qr();
    const enabled = container.querySelector('[role=switch]');
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
