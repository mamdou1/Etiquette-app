import React, { useState } from 'react';
import { HierarchyData } from '../services/agenceService';

const compare = (a: string, b: string) => a.localeCompare(b, 'fr', { numeric: true });
export function selectBoxRange(numbers: string[], from: string, to: string, year: string): string[] {
  // Accepter aussi 10 à 25 lorsque les numéros sont écrits 010/2021.
  const value = (number: string) => /^\d+$/.test(from) && /^\d+$/.test(to) && number.endsWith(`/${year}`)
    ? number.slice(0, -(year.length + 1)) : number;
  return numbers.filter(number => compare(value(number), from) >= 0 && compare(value(number), to) <= 0)
    .sort(compare);
}

interface Props {
  hierarchy: HierarchyData;
  onGenerate: (boxes: Array<{ boxNumber: string; records: any[]; year: string }>, title: string, level: 'annee') => Promise<void>;
}

export default function BoxRangeGenerator({ hierarchy, onGenerate }: Props) {
  const [typeId, setTypeId] = useState('');
  const [year, setYear] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const type = hierarchy.types.find(type => String(type.id) === typeId);
  const numbers = type?.annees.find(item => item.annee === year)?.boites.map(box => box.numero_boite) || [];
  const selected = selectBoxRange(numbers, from.trim(), to.trim(), year);
  const resetRange = () => { setFrom(''); setTo(''); setError(''); };
  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!type || !year || !from.trim() || !to.trim()) { setError('Choisissez le type, l’année et les deux limites.'); return; }
    if (compare(from.trim(), to.trim()) > 0) { setError('Le numéro de début doit être inférieur ou égal au numéro de fin.'); return; }
    if (!selected.length) { setError('Aucune boîte enregistrée dans cette plage pour cette année.'); return; }
    setBusy(true);
    try {
      await onGenerate(selected.map(boxNumber => ({ boxNumber, year,
        records: [{ type_document: type.nom, __typeId: String(type.id) }],
      })), `${type.nom} — ${year} — Boîtes ${from.trim()} à ${to.trim()}`, 'annee');
    } catch { setError('Impossible de générer les étiquettes. Réessayez.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={generate} className="no-print bg-white border border-border rounded-lg p-5 mb-6">
    <h2 className="font-bold mb-2">Générer une plage de boîtes</h2>
    <p className="text-sm text-muted mb-4">Agence : {hierarchy.agence.nom}. Les deux limites sont incluses ; seules les boîtes existantes seront imprimées.</p>
    <fieldset disabled={busy} className="flex flex-wrap gap-4 items-end">
      <label className="text-sm">Type de document
        <select required className="block border rounded p-2 mt-1" value={typeId} onChange={event => { setTypeId(event.target.value); setYear(''); resetRange(); }}>
          <option value="">Choisir un type</option>
          {hierarchy.types.map(type => <option key={type.id} value={type.id}>{type.nom}</option>)}
        </select>
      </label>
      <label className="text-sm">Année
        <select required disabled={!type} className="block border rounded p-2 mt-1" value={year} onChange={event => { setYear(event.target.value); resetRange(); }}>
          <option value="">Choisir une année</option>
          {type?.annees.map(item => <option key={item.annee} value={item.annee}>{item.annee}</option>)}
        </select>
      </label>
      <label className="text-sm">N° boîte de début
        <input required disabled={!year} list="range-box-numbers" className="block border rounded p-2 mt-1 w-40" placeholder="Ex. 10" value={from} onChange={event => { setFrom(event.target.value); setError(''); }} />
      </label>
      <label className="text-sm">N° boîte de fin
        <input required disabled={!year} list="range-box-numbers" className="block border rounded p-2 mt-1 w-40" placeholder="Ex. 25" value={to} onChange={event => { setTo(event.target.value); setError(''); }} />
      </label>
      <datalist id="range-box-numbers">{numbers.map(number => <option key={number} value={number} />)}</datalist>
      <button disabled={!year || !from.trim() || !to.trim()} type="submit" className="bg-accent text-white px-4 py-2 rounded disabled:opacity-50">{busy ? 'Génération…' : 'Générer les étiquettes'}</button>
    </fieldset>
    {from.trim() && to.trim() && <p className="text-sm mt-3" role="status">{selected.length} boîte(s) dans cette plage.</p>}
    {error && <p className="text-red-700 mt-3" role="alert">{error}</p>}
  </form>;
}
