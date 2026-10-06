import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { TextEncoder } from 'util';
import LabelCard from './LabelCard';
import LabelEditorModal from './LabelEditorModal';
import { loadLabel, saveLabel, labelToRecord } from '../services/labelService';

global.TextEncoder = TextEncoder;
global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('../services/labelService', () => ({
  ...jest.requireActual('../services/labelService'), loadLabel: jest.fn(), saveLabel: jest.fn(),
}));
jest.mock('qrcode.react', () => ({ QRCodeSVG: props => <svg data-testid="qr" data-value={props.value} width={props.size} /> }));
jest.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({
  fontSize: { valueSize: 16, agenceSize: 20, qrSize: 220 }, fontStyle: { valueWeight: 'bold' },
  fontFamily: 'sans-serif', showQr: true, valueSpacing: 0, boxPrefix: 'Boîte N°',
  fieldRange: { enabled: false, from: '', to: '' },
}) }));

const label = {
  id: 1, agence_id: 1, type_document_id: 1, numero_boite: '161', annee: '2021', boxField: 'N° Boîte',
  rows: [{ 'N° Boîte': '161', 'N° dossier': '001', Nature: 'Caution', 'Date de production': '10/09/2021' },
    { 'N° Boîte': '161', 'N° dossier': '002', Nature: 'Prêt', 'Date de production': '11/09/2021' }],
  metaValues: { 'N° Boîte': '161', Nature: 'Caution, Prêt' }, revision: 1, qrEnabled: null, qrSize: null,
};
let container, root;
beforeEach(() => {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  jest.clearAllMocks(); loadLabel.mockResolvedValue(JSON.parse(JSON.stringify(label)));
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = async element => { await act(async () => { root.render(element); }); };

test('editing one row preserves associations and sends individual QR settings to the API', async () => {
  const onSaved = jest.fn(), onClose = jest.fn();
  saveLabel.mockImplementation(async draft => ({ ...draft, revision: 2 }));
  await render(<LabelEditorModal record={labelToRecord(label)} onSaved={onSaved} onClose={onClose} />);
  act(() => {
    Simulate.change(document.querySelector('[aria-label="Nature, ligne 2"]'), { target: { value: 'Corrigée' } });
    Simulate.change(document.querySelector('select'), { target: { value: 'false' } });
    Simulate.change(document.querySelector('input[type=checkbox]'), { target: { checked: true } });
  });
  act(() => Simulate.change(document.querySelector('input[type=range]'), { target: { value: '180' } }));
  await act(async () => Simulate.submit(document.querySelector('form')));
  const saved = saveLabel.mock.calls[0][0];
  expect(saved.rows[0]).toEqual(label.rows[0]);
  expect(saved.rows[1]).toEqual({ ...label.rows[1], Nature: 'Corrigée' });
  expect(saved.qrEnabled).toBe(false); expect(saved.qrSize).toBe(180);
  expect(onSaved).toHaveBeenCalledTimes(1); expect(onClose).toHaveBeenCalledTimes(1);
});

test('failed saving leaves the form and unsaved corrections available', async () => {
  const onSaved = jest.fn(), onClose = jest.fn();
  saveLabel.mockRejectedValue({ response: { data: { message: 'Cette étiquette a changé.' } } });
  await render(<LabelEditorModal record={labelToRecord(label)} onSaved={onSaved} onClose={onClose} />);
  act(() => Simulate.change(document.querySelector('[aria-label="Nature, ligne 2"]'), { target: { value: 'Corrigée' } }));
  await act(async () => Simulate.submit(document.querySelector('form')));
  expect(document.querySelector('[role=alert]').textContent).toContain('a changé');
  expect(document.querySelector('[aria-label="Nature, ligne 2"]').value).toBe('Corrigée');
  expect(onSaved).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
});

test('cancel does not save', async () => {
  const onClose = jest.fn();
  await render(<LabelEditorModal record={labelToRecord(label)} onSaved={jest.fn()} onClose={onClose} />);
  const cancel = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Annuler');
  act(() => Simulate.click(cancel));
  expect(saveLabel).not.toHaveBeenCalled(); expect(onClose).toHaveBeenCalledTimes(1);
});

test('label QR uses stored size, visibility and corrected dossier values', async () => {
  const renderCard = async stored => render(<LabelCard record={labelToRecord(stored)} allFields={['N° Boîte', 'Nature']}
    visibleFields={['N° Boîte', 'Nature']} size="md" boxNumber="161" />);
  await renderCard({ ...label, qrSize: 180 });
  expect(container.querySelector('[data-testid=qr]').getAttribute('width')).toBe('180');
  expect(container.querySelector('[data-testid=qr]').getAttribute('data-value')).toContain('002 | Prêt | 11/09/2021');
  await renderCard({ ...label, qrEnabled: false });
  expect(container.querySelector('[data-testid=qr]')).toBeNull();
  await renderCard({ ...label, rows: label.rows.map(row => ({ ...row, Nature: 'Corrigée' })) });
  expect(container.querySelector('[data-testid=qr]').getAttribute('width')).toBe('220');
  expect(container.querySelector('[data-testid=qr]').getAttribute('data-value')).toContain('Corrigée');
  act(() => Simulate.click(container.querySelector('button[aria-label="Modifier la boîte 161"]')));
  await act(async () => {});
  expect(document.querySelector('[role=dialog]')).not.toBeNull();
});
