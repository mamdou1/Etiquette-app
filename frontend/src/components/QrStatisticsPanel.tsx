import React, { useMemo } from 'react';
import { LabelRecord } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { sourceRows, countValues } from '../utils/qrStatistics';

export default function QrStatisticsPanel({ records, labels = [] }: {
  records: LabelRecord[]; labels?: Array<{ name: string; label: string }>;
}) {
  const { qrStatistics: settings, setQrStatistics } = useSettings();
  const sources = useMemo(() => records.map(sourceRows), [records]);
  const rows = useMemo(() => sources.flatMap(rows => rows || []), [sources]);
  const columns = useMemo(() => Array.from(new Set(rows.flatMap(row => Object.keys(row))))
    .filter(field => !field.startsWith('_') && field !== 'metaValues'), [rows]);
  const options = useMemo(() => new Map(settings.enabled ? settings.columns.map(field => [field, countValues(rows, field).map(([value]) => value)]) : []), [rows, settings.enabled, settings.columns]);
  return <section className="rounded-xl border border-border bg-white p-4 my-4 space-y-3" aria-label="Statistiques dans le QR">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="font-semibold text-sm">Statistiques dans le QR</h3><p className="text-xs text-muted mt-1">Un récapitulatif pour chaque boîte</p></div>
      <input type="checkbox" role="switch" aria-label="Ajouter les statistiques au QR" checked={settings.enabled}
        onChange={event => setQrStatistics(current => ({ ...current, enabled: event.target.checked }))} />
    </div>
    {settings.enabled && <>
      <p className="text-xs text-muted">Choisissez les colonnes puis les valeurs à compter. Une cellule = une occurrence. Les cellules vides sont regroupées sous « Non renseigné ».</p>
      {sources.some(rows => !rows) && <p role="status" className="text-xs text-amber-700">Certaines boîtes n’ont pas leurs lignes de dossiers : réimportez leur fichier pour obtenir les statistiques.</p>}
      {!columns.length && <p className="text-xs text-muted">Aucune colonne disponible.</p>}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {columns.map(field => {
          const active = settings.columns.includes(field);
          return <div key={field} className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={active}
              onChange={event => setQrStatistics(current => ({ ...current, columns: event.target.checked ? [...current.columns, field] : current.columns.filter(name => name !== field) }))} />
              {labels.find(label => label.name === field)?.label || field}
            </label>
            {active && <div className="mt-2 pl-4 space-y-2">
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={() => setQrStatistics(current => ({ ...current, excluded: { ...current.excluded, [field]: [] } }))}>Tout cocher</button>
                <button type="button" onClick={() => setQrStatistics(current => ({ ...current, excluded: { ...current.excluded, [field]: options.get(field) || [] } }))}>Tout décocher</button>
              </div>
              {(options.get(field) || []).map(value => <label key={value} className="flex items-start gap-2 text-xs break-words">
                <input type="checkbox" className="mt-0.5" checked={!(settings.excluded[field] || []).includes(value)}
                  onChange={event => setQrStatistics(current => ({ ...current, excluded: { ...current.excluded,
                    [field]: event.target.checked ? (current.excluded[field] || []).filter(item => item !== value) : [...(current.excluded[field] || []), value],
                  } }))} />{value || '(Non renseigné)'}
              </label>)}
            </div>}
          </div>;
        })}
      </div>
      <p className="text-xs text-muted">Ces choix s’appliquent aux boîtes de la sélection. Les informations d’origine restent dans le QR.</p>
    </>}
  </section>;
}
