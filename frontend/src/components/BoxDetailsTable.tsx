import React from 'react';
import { LabelRecord } from '../types';

interface Props {
  boxNumber: string;
  record: LabelRecord;
  fields: Array<{ name: string; label: string }>;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function BoxDetailsTable({ boxNumber, record, fields }: Props) {
  let sourceRows: LabelRecord[] = [];
  try {
    const parsed = JSON.parse(String(record.__sourceRows || 'null'));
    if (Array.isArray(parsed) && parsed.every(row => row && typeof row === 'object' && !Array.isArray(row))) {
      sourceRows = parsed;
    }
  } catch { /* Les anciennes boîtes peuvent ne pas contenir les lignes sources. */ }

  const hasSourceRows = sourceRows.length > 0;
  const rows = hasSourceRows ? sourceRows : [record];
  const names = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const columns = names.filter(name => !name.startsWith('_') && name !== 'metaValues').map(name => ({
    name,
    label: fields.find(field => field.name === name)?.label || name,
  })).filter(field => {
    const name = normalize(field.name).replace(/[^a-z0-9]/g, '');
    return !/^(?:(?:n|no|num|numero)(?:de)?(?:la)?boite|boite|boxnumber|box|numbox|nobox|numero)$/.test(name);
  });
  const valueOf = (row: LabelRecord, name: string) => String(row[name] ?? '');
  const isDetail = (field: { name: string; label: string }) =>
    /dossier|nature|date/.test(normalize(`${field.name} ${field.label}`)) ||
    rows.some(row => valueOf(row, field.name) !== valueOf(rows[0], field.name));
  const details = columns.filter(isDetail);
  const common = columns.filter(field => !isDetail(field));

  return (
    <div className="space-y-4 min-w-0">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div><dt className="font-semibold">N° Boîte</dt><dd>{boxNumber}</dd></div>
        {common.map(field => <div key={field.name}>
          <dt className="font-semibold">{field.label}</dt>
          <dd className="break-words whitespace-pre-wrap">{valueOf(rows[0], field.name) || '—'}</dd>
        </div>)}
      </dl>
      {!hasSourceRows && <p className="text-sm text-amber-700">
        Les lignes d’origine ne sont pas disponibles pour cette boîte. Réimportez le fichier Excel pour retrouver les correspondances exactes entre dossiers, natures et dates. Les valeurs enregistrées sont affichées ensemble ci-dessous.
      </p>}
      {details.length > 0 && <>
        <p className="text-xs text-gray-600">Faites défiler le tableau de gauche à droite pour consulter toutes les colonnes.</p>
        <div className="max-w-full overflow-x-auto border rounded" tabIndex={0} role="region" aria-label="Dossiers de la boîte, tableau à défilement horizontal">
          <table className="min-w-full w-max text-sm border-collapse">
            <caption className="text-left p-3">{hasSourceRows ? `${rows.length} lignes du fichier source` : 'Valeurs enregistrées'}</caption>
            <thead className="bg-gray-100"><tr>
              {details.map(field => <th scope="col" key={field.name} className="text-left px-4 py-3 border-b border-r border-dotted whitespace-nowrap">{field.label}</th>)}
            </tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index} className="odd:bg-white even:bg-gray-50">
              {details.map(field => <td key={field.name} className="align-top px-4 py-3 border-b border-r border-dotted whitespace-pre">{valueOf(row, field.name) || '—'}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
