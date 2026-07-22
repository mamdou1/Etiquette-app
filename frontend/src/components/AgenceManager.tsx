import React, { useState, useEffect } from "react";
import {
  Agence,
  getAllAgences,
  createAgence,
  updateAgence,
  deleteAgence,
} from "../services/agenceService";

interface AgenceManagerProps {
  onSelect?: (agence: Agence | null) => void;
  selectedId?: number;
}

const AgenceManager: React.FC<AgenceManagerProps> = ({ onSelect, selectedId }) => {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgence, setEditingAgence] = useState<Agence | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    code: "",
  });
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // ─── Charger les agences ────────────────────────────────────
  useEffect(() => {
    loadAgences();
  }, [filterActive]);

  const loadAgences = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAllAgences(filterActive);
      if (response.success) {
        setAgences(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  // ─── CRUD ────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      const agence = await createAgence(formData.nom, formData.code);
      setSuccess(`✅ Agence "${agence.nom}" créée avec succès !`);
      await loadAgences();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la création");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgence?.id) return;
    try {
      setError("");
      setSuccess("");
      const agence = await updateAgence(editingAgence.id, {
        nom: formData.nom,
        code: formData.code,
      });
      setSuccess(`✅ Agence "${agence.nom}" mise à jour avec succès !`);
      await loadAgences();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id: number, nom: string) => {
    if (!window.confirm(`Voulez-vous vraiment désactiver l'agence "${nom}" ?`)) return;
    try {
      setError("");
      setSuccess("");
      const success = await deleteAgence(id);
      if (success) {
        setSuccess(`✅ Agence "${nom}" désactivée avec succès !`);
        await loadAgences();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  // ─── Modal ──────────────────────────────────────────────────
  const openModal = (agence?: Agence) => {
    if (agence) {
      setEditingAgence(agence);
      setFormData({
        nom: agence.nom,
        code: agence.code,
      });
    } else {
      setEditingAgence(null);
      setFormData({
        nom: "",
        code: "",
      });
    }
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAgence(null);
    setFormData({ nom: "", code: "" });
    setError("");
  };

  // ─── Rendu ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary">🏢 Gestion des Agences</h2>
        <div className="flex gap-3">
          <select
            value={filterActive === undefined ? "all" : filterActive ? "active" : "inactive"}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "all") setFilterActive(undefined);
              else if (val === "active") setFilterActive(true);
              else setFilterActive(false);
            }}
            className="border border-border px-3 py-2 rounded font-mono text-sm focus:outline-none focus:border-accent"
          >
            <option value="all">Toutes</option>
            <option value="active">Actives</option>
            <option value="inactive">Inactives</option>
          </select>
          <button
            onClick={() => openModal()}
            className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
          >
            <span className="text-lg font-bold">+</span> Nouvelle Agence
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-center gap-2">
          <span className="text-lg">❌</span> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <span className="text-lg">✅</span> {success}
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface border-b-2 border-border">
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Nom</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Statut</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Créée le</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agences.map((agence, index) => (
              <tr 
                key={agence.id} 
                className={`border-b border-border hover:bg-surface/50 transition-colors ${
                  selectedId === agence.id ? "bg-accent-light" : ""
                }`}
                onClick={() => onSelect?.(agence)}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted">{agence.id}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-accent">{agence.code}</td>
                <td className="px-4 py-3 font-medium">{agence.nom}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                      agence.active
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-red-100 text-red-700 border border-red-200"
                    }`}
                  >
                    {agence.active ? "🟢 Actif" : "🔴 Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted font-mono">
                  {agence.created_at ? new Date(agence.created_at).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openModal(agence); }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-mono px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(agence.id!, agence.nom); }}
                      className="text-red-600 hover:text-red-800 text-xs font-mono px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      🗑️ Désactiver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {agences.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted font-mono">
                  <div className="text-4xl mb-3">📭</div>
                  Aucune agence enregistrée
                  <br />
                  <span className="text-xs">Cliquez sur "Nouvelle Agence" pour en créer une</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="mt-4 text-xs text-muted font-mono">
        {agences.length} agence{agences.length > 1 ? "s" : ""} trouvée{agences.length > 1 ? "s" : ""}
        {filterActive !== undefined && (
          <span className="ml-2">
            ({filterActive ? "actives" : "inactives"})
          </span>
        )}
      </div>

      {/* ─── MODAL ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">
                {editingAgence ? "✏️ Modifier l'agence" : "🏢 Nouvelle agence"}
              </h3>
              <button onClick={closeModal} className="text-muted hover:text-primary text-xl">
                ✕
              </button>
            </div>

            <form onSubmit={editingAgence ? handleUpdate : handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                    Code * <span className="text-accent">(ex: DGEI)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-sm uppercase"
                    placeholder="CODE"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                    Nom * <span className="text-accent">(ex: Direction Générale)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                    className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-sm"
                    placeholder="NOM DE L'AGENCE"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                  ❌ {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-accent hover:bg-red-700 text-white py-2.5 rounded font-mono text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {editingAgence ? "💾 Mettre à jour" : "✨ Créer"}
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

export default AgenceManager;