import React, { useState } from 'react';
import { MetaField } from '../services/metaFieldService';
import { createBoite } from '../services/agenceService';

interface AddBoiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenceId: number | null;
  typeId: number | null;
  typeNom: string;
  metaFields: MetaField[];
  onSuccess: () => void;
  loading: boolean;
}

const AddBoiteModal: React.FC<AddBoiteModalProps> = ({
  isOpen,
  onClose,
  agenceId,
  typeId,
  typeNom,
  metaFields,
  onSuccess,
  loading,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [numeroBoite, setNumeroBoite] = useState('');
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenceId || !typeId) {
      setError('Agence ou type non sélectionné');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Construire les metaValues
      const metaValues: Record<string, any> = {};
      metaFields.forEach(mf => {
        if (formData[mf.name] !== undefined && formData[mf.name] !== '') {
          metaValues[mf.name] = formData[mf.name];
        }
      });

      await createBoite({
        agence_id: agenceId,
        type_document_id: typeId,
        numero_boite: numeroBoite,
        annee: annee,
        meta_values: metaValues,
      });

      onSuccess();
      onClose();
      setFormData({});
      setNumeroBoite('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal-panel max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-header">
          <h3 className="ui-modal-title">
            ➕ Ajouter une boîte - {typeNom}
          </h3>
          <button type="button" onClick={onClose} className="ui-icon-button text-xl" aria-label="Fermer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Numéro de boîte */}
          <div>
            <label className="block font-mono text-xs text-muted mb-1 font-semibold">
              N° de boîte *
            </label>
            <input
              type="text"
              value={numeroBoite}
              onChange={(e) => setNumeroBoite(e.target.value)}
              className="ui-field"
              placeholder="BOX-001"
              required
            />
          </div>

          {/* Année */}
          <div>
            <label className="block font-mono text-xs text-muted mb-1 font-semibold">
              Année *
            </label>
            <input
              type="text"
              value={annee}
              onChange={(e) => setAnnee(e.target.value)}
              className="ui-field"
              placeholder="2024"
              required
            />
          </div>

          {/* Champs dynamiques */}
          {metaFields.map((mf) => (
            <div key={mf.id}>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                {mf.label} {mf.required && <span className="text-accent">*</span>}
                <span className="text-muted/50 ml-2 text-[10px]">({mf.field_type})</span>
              </label>
              {mf.field_type === 'textarea' ? (
                <textarea
                  value={formData[mf.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [mf.name]: e.target.value })}
                  className="ui-field resize-none"
                  rows={2}
                  placeholder={mf.label}
                />
              ) : mf.field_type === 'select' ? (
                <select
                  value={formData[mf.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [mf.name]: e.target.value })}
                  className="ui-field"
                >
                  <option value="">Sélectionner...</option>
                  {/* Options à ajouter via mf.options */}
                </select>
              ) : mf.field_type === 'date' ? (
                <input
                  type="date"
                  value={formData[mf.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [mf.name]: e.target.value })}
                  className="ui-field"
                />
              ) : mf.field_type === 'number' ? (
                <input
                  type="number"
                  value={formData[mf.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [mf.name]: parseFloat(e.target.value) || '' })}
                  className="ui-field"
                  placeholder={mf.label}
                />
              ) : mf.field_type === 'boolean' ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData[mf.name] || false}
                    onChange={(e) => setFormData({ ...formData, [mf.name]: e.target.checked })}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="font-mono text-sm">Oui</span>
                </label>
              ) : (
                <input
                  type="text"
                  value={formData[mf.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [mf.name]: e.target.value })}
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm"
                  placeholder={mf.label}
                />
              )}
            </div>
          ))}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
              ❌ {error}
            </div>
          )}

          <div className="ui-modal-actions">
            <button
              type="submit"
              disabled={submitting || loading}
              className="ui-button ui-button-primary flex-1"
            >
              {submitting ? '⏳ Enregistrement...' : '💾 Enregistrer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ui-button ui-button-secondary flex-1"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBoiteModal;
