import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LabelRecord } from '../types';
import { loadLabel, saveLabel, StoredLabel } from '../services/labelService';
import { useSettings } from '../contexts/SettingsContext';
import { isBoxField } from '../utils/boxField';

interface Props {
  record: LabelRecord;
  onClose: () => void;
  onSaved: (label: StoredLabel) => void;
}

export default function LabelEditorModal({ record, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<StoredLabel | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { fontSize, showQr } = useSettings();
  const dialog = useRef<HTMLDivElement>(null);
  const errorText = (err: any) => err.response?.data?.message || 'Impossible de joindre le serveur. Vos modifications ne sont pas enregistrées.';

  useEffect(() => {
    let active = true;
    loadLabel(record).then(label => { if (active) setDraft(label); })
      .catch(err => { if (active) setError(errorText(err)); });
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => { active = false; previous?.focus(); };
  }, [record]);

  const keys = draft ? Array.from(new Set(draft.rows.flatMap(row => Object.keys(row))))
    .filter(key => !key.startsWith('_') && key !== draft.boxField && !isBoxField(key)) : [];
  const setCell = (index: number, key: string, value: string) => setDraft(current => current && ({
    ...current, rows: current.rows.map((row, i) => i === index ? { ...row, [key]: value } : row),
  }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true); setError('');
    try { const saved = await saveLabel(draft); onSaved(saved); onClose(); }
    catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="no-print fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 1000 }} onClick={event => event.stopPropagation()}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="label-editor-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6"
        onKeyDown={event => {
          if (event.key === 'Escape' && !saving) { event.stopPropagation(); onClose(); }
          if (event.key === 'Tab') {
            const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)');
            if (!elements?.length) { event.preventDefault(); return; }
            const first = elements[0], last = elements[elements.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
        <div className="flex justify-between items-center gap-4 mb-4">
          <h2 id="label-editor-title" className="text-xl font-bold">Modifier l’étiquette</h2>
          <button type="button" disabled={saving} onClick={onClose} className="border rounded px-3 py-2">Fermer</button>
        </div>
        {error && <p role="alert" className="bg-red-50 text-red-700 p-3 mb-4 rounded">{error}</p>}
        {!draft ? (!error && <p role="status">Chargement des informations enregistrées…</p>) : (
          <form onSubmit={submit}>
            <fieldset disabled={saving} className="space-y-5">
              <label className="block">N° boîte
                <input required maxLength={50} className="block border rounded p-2 mt-1" value={draft.numero_boite}
                  onChange={event => setDraft(current => current && ({ ...current, numero_boite: event.target.value }))} />
              </label>
              <p className="text-sm text-muted">Vérifiez et modifiez les informations ligne par ligne. L’enregistrement met à jour la base de données, l’étiquette et le contenu des QR codes.</p>
              {!record.__sourceRows && <p className="text-sm text-amber-700">Ancien import : les valeurs sont présentées telles qu’elles ont été conservées en base. Réimportez le fichier pour retrouver les lignes de dossiers d’origine.</p>}
              <div className="overflow-x-auto max-h-[45vh] overflow-y-auto border rounded">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-gray-100"><tr><th className="p-2 border">Ligne</th>{keys.map(key => <th key={key} className="p-2 border text-left">{key}</th>)}</tr></thead>
                  <tbody>{draft.rows.map((row, index) => <tr key={index}>
                    <th className="p-2 border">{index + 1}</th>
                    {keys.map(key => <td key={key} className="p-1 border">
                      <textarea aria-label={`${key}, ligne ${index + 1}`} className="block w-full min-w-[180px] border rounded p-2" rows={2}
                        value={String(row[key] ?? '')} onChange={event => setCell(index, key, event.target.value)} />
                    </td>)}
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-6 items-start">
                <label>QR de cette étiquette
                  <select className="block border rounded p-2 mt-1" value={draft.qrEnabled === null ? 'default' : String(draft.qrEnabled)}
                    onChange={event => setDraft(current => current && ({ ...current, qrEnabled: event.target.value === 'default' ? null : event.target.value === 'true' }))}>
                    <option value="default">Réglage général ({showQr ? 'affiché' : 'masqué'})</option>
                    <option value="true">Afficher</option><option value="false">Masquer</option>
                  </select>
                </label>
                <div>
                  <label className="flex gap-2 items-center"><input type="checkbox" checked={draft.qrSize !== null}
                    onChange={event => setDraft(current => current && ({ ...current, qrSize: event.target.checked ? Math.min(260, Math.max(96, fontSize.qrSize)) : null }))} />Taille personnalisée pour cette étiquette</label>
                  {draft.qrSize !== null ? <label className="block mt-2">Taille QR : {draft.qrSize} px
                    <input aria-label="Taille QR" type="range" min={96} max={260} step={1} value={draft.qrSize} className="block w-full"
                      onChange={event => setDraft(current => current && ({ ...current, qrSize: Number(event.target.value) }))} />
                  </label> : <p className="text-sm mt-2">Taille générale : {fontSize.qrSize} px</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="border rounded px-4 py-2" onClick={onClose}>Annuler</button>
                <button type="submit" className="bg-accent text-white rounded px-4 py-2">{saving ? 'Enregistrement…' : 'Enregistrer en base'}</button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </div>, document.body,
  );
}
