import React, { useState, useEffect } from "react";
import {
  TypeDocument,
  getAllTypes,
  createType,
  updateType,
  deleteType,
} from "../services/typeDocumentService";
import { Agence, getAllAgences } from "../services/agenceService";

interface TypeDocumentManagerProps {
  agenceId?: number;
}

const TypeDocumentManager: React.FC<TypeDocumentManagerProps> = ({
  agenceId,
}) => {
  const [types, setTypes] = useState<TypeDocument[]>([]);
  const [agences, setAgences] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TypeDocument | null>(null);
  const [formData, setFormData] = useState<{
    nom: string;
    code: string;
    description: string;
    agence_ids: number[];
  }>({
    nom: "",
    code: "",
    description: "",
    agence_ids: [],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [typesRes, agencesRes] = await Promise.all([
        getAllTypes(agenceId ? { agence_id: agenceId } : {}),
        getAllAgences(),
      ]);
      setTypes(typesRes.data);
      setAgences(agencesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [agenceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      const data = {
        nom: formData.nom,
        code: formData.code || formData.nom.toUpperCase(),
        description: formData.description,
        agence_ids: formData.agence_ids,
      };

      if (editingType) {
        await updateType(editingType.id, data);
        setSuccess(`✅ Type "${data.nom}" mis à jour avec succès !`);
      } else {
        await createType(data);
        setSuccess(`✅ Type "${data.nom}" créé avec succès !`);
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erreur lors de l'enregistrement",
      );
    }
  };

  const handleDelete = async (id: number, nom: string) => {
    if (!window.confirm(`Voulez-vous désactiver le type "${nom}" ?`)) return;
    try {
      await deleteType(id);
      setSuccess(`✅ Type "${nom}" désactivé`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const openModal = (type?: TypeDocument) => {
    if (type) {
      setEditingType(type);
      setFormData({
        nom: type.nom,
        code: type.code || "",
        description: type.description || "",
        agence_ids: type.agence_ids || [],
      });
    } else {
      setEditingType(null);
      setFormData({
        nom: "",
        code: "",
        description: "",
        agence_ids: agenceId ? [agenceId] : [],
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setFormData({ nom: "", code: "", description: "", agence_ids: [] });
  };

  // ✅ CORRECTION : Vérifier que agence.id n'est pas undefined
  const toggleAgence = (agenceId: number) => {
    setFormData((prev) => ({
      ...prev,
      agence_ids: prev.agence_ids.includes(agenceId)
        ? prev.agence_ids.filter((id) => id !== agenceId)
        : [...prev.agence_ids, agenceId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-primary">
            📄 Types de documents
          </h3>
          <p className="text-xs text-muted font-mono">
            Un type peut être attribué à plusieurs agences
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
        >
          <span className="text-lg font-bold">+</span> Nouveau type
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-center gap-2">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          ✅ {success}
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">
                Code
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">
                Nom
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">
                Agences
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">
                Statut
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr
                key={type.id}
                className="border-b border-border hover:bg-surface/50 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs font-bold text-accent">
                  {type.code}
                </td>
                <td className="px-4 py-3">{type.nom}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {type.agence_noms && type.agence_noms.length > 0 ? (
                      type.agence_noms.map((nom, i) => (
                        <span
                          key={i}
                          className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-200"
                        >
                          {nom}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-xs">Aucune</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                      type.active
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-red-100 text-red-700 border border-red-200"
                    }`}
                  >
                    {type.active ? "🟢 Actif" : "🔴 Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(type)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-mono px-2 py-1 rounded hover:bg-blue-50"
                    >
                      ✏️ Modifier
                    </button>
                    {type.active ? (
                      <button
                        onClick={() => handleDelete(type.id, type.nom)}
                        className="text-red-600 hover:text-red-800 text-xs font-mono px-2 py-1 rounded hover:bg-red-50"
                      >
                        🗑️ Désactiver
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (window.confirm(`Réactiver "${type.nom}" ?`)) {
                            updateType(type.id, { active: true }).then(() =>
                              loadData(),
                            );
                          }
                        }}
                        className="text-emerald-600 hover:text-emerald-800 text-xs font-mono px-2 py-1 rounded hover:bg-emerald-50"
                      >
                        🔄 Réactiver
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-muted font-mono"
                >
                  <div className="text-4xl mb-3">📭</div>
                  Aucun type de document
                  <br />
                  <span className="text-xs">
                    Cliquez sur "Nouveau type" pour commencer
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de création/édition */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">
                {editingType
                  ? "✏️ Modifier le type"
                  : "📄 Nouveau type de document"}
              </h3>
              <button
                onClick={closeModal}
                className="text-muted hover:text-primary text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                  Code <span className="text-accent">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm uppercase"
                  placeholder="CODE (ex: PDC)"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                  Nom *{" "}
                  <span className="text-accent">(ex: Pièces de caisse)</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm"
                  placeholder="Nom du type"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm resize-none"
                  placeholder="Description optionnelle..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-2 font-semibold">
                  Agences{" "}
                  <span className="text-accent">(sélection multiple)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border rounded p-2 bg-surface">
                  // Dans la partie checkbox, ajouter une vérification
                  {agences.map((agence) => (
                    <label
                      key={agence.id}
                      className="flex items-center gap-2 font-mono text-sm cursor-pointer hover:bg-white px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={
                          agence.id !== undefined &&
                          formData.agence_ids.includes(agence.id)
                        }
                        onChange={() =>
                          agence.id !== undefined && toggleAgence(agence.id)
                        }
                        className="w-4 h-4 accent-accent"
                      />
                      <span>{agence.nom}</span>
                    </label>
                  ))}
                  {agences.length === 0 && (
                    <span className="col-span-2 text-center text-muted text-xs py-2">
                      Aucune agence disponible
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-1">
                  {formData.agence_ids.length} agence
                  {formData.agence_ids.length > 1 ? "s" : ""} sélectionnée
                  {formData.agence_ids.length > 1 ? "s" : ""}
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                  ❌ {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-accent hover:bg-red-700 text-white py-2.5 rounded font-mono text-sm transition-colors"
                >
                  {editingType ? "💾 Mettre à jour" : "✨ Créer"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-surface hover:bg-border text-primary py-2.5 rounded font-mono text-sm transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypeDocumentManager;
