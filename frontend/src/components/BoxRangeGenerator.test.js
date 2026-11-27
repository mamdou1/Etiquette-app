import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import BoxRangeGenerator, { selectBoxRange } from './BoxRangeGenerator';

global.IS_REACT_ACT_ENVIRONMENT = true;
test('inclusive numeric range, gaps and leading zeros', () => {
  expect(selectBoxRange(['100', '25', '010', '2', '12'], '10', '25', '2021')).toEqual(['010', '12', '25']);
  expect(selectBoxRange(['010/2021', '025/2021', '026/2021'], '10', '25', '2021')).toEqual(['010/2021', '025/2021']);
  expect(selectBoxRange(['10', '25'], '15', '20', '2021')).toEqual([]);
  expect(selectBoxRange(['10', '25'], '25', '25', '2021')).toEqual(['25']);
});

test('generation isolates type and year, validates reversed limits, resets on type change', async () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const onGenerate = jest.fn().mockResolvedValue(undefined);
  const year = (annee, numbers) => ({ annee, boites: numbers.map(numero_boite => ({ numero_boite })) });
  const hierarchy = { agence: { id: 1, nom: 'Agence Test' }, types: [
    { id: 1, nom: 'CrÃ©dit', annees: [year('2021', ['2', '10', '25']), year('2022', ['12'])] },
    { id: 2, nom: 'Caisse', annees: [year('2021', ['13'])] },
  ] };
  try {
    act(() => root.render(<BoxRangeGenerator hierarchy={hierarchy} onGenerate={onGenerate} />));
    const change = (selector, value) => act(() => Simulate.change(container.querySelector(selector), { target: { value } }));
    change('select', '1');
    act(() => Simulate.change(container.querySelectorAll('select')[1], { target: { value: '2021' } }));
    change('input[placeholder="Ex. 10"]', '10');
    change('input[placeholder="Ex. 25"]', '25');
    await act(async () => Simulate.submit(container.querySelector('form')));
    expect(onGenerate.mock.calls[0][0].map(box => box.boxNumber)).toEqual(['10', '25']);
    expect(onGenerate.mock.calls[0][0].every(box => box.year === '2021' && box.records[0].__typeId === '1')).toBe(true);
    change('input[placeholder="Ex. 10"]', '30');
    await act(async () => Simulate.submit(container.querySelector('form')));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role=alert]').textContent).toContain('inférieur');
    change('select', '2');
    expect(container.querySelectorAll('select')[1].value).toBe('');
    expect(container.querySelector('input').value).toBe('');
  } finally {
    act(() => root.unmount()); container.remove();
  }
});
