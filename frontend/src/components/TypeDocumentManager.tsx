import React, { useState, useEffect } from "react";
import {
  TypeDocument,
  getAllTypes,
  createType,
  updateType,
  deleteType,
  assignTypeToAgences,
} from "../services/typeDocumentService";
import {
  MetaField,
  getMetaFieldsByType,
  createMetaField,
  updateMetaField,
  deleteMetaField,
  createMetaFieldsBatch,
} from "../services/metaFieldService";
import { Agence, getAllAgences } from "../services/agenceService";

interface TypeDocumentManagerProps {
  agenceId?: number;
}

interface MetaFieldFormRow {
  id: string;
  name: string;
  label: string;
  field_type: string;
  position: number;
  required: boolean;
  visible: boolean;
}

const TypeDocumentManager: React.FC<TypeDocumentManagerProps> = ({
  agenceId,
}) => {
  const [types, setTypes] = useState<TypeDocument[]>([]);
  const [agences, setAgences] = useState<Agence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── États pour le modal Type ──────────────────────────────
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TypeDocument | null>(null);
  const [typeFormData, setTypeFormData] = useState<{
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

  // ─── États pour le modal MetaField ─────────────────────────
  const [isMetaFieldModalOpen, setIsMetaFieldModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedTypeNom, setSelectedTypeNom] = useState<string>("");
  const [metaFields, setMetaFields] = useState<MetaField[]>([]);
  const [editingMetaField, setEditingMetaField] = useState<MetaField | null>(
    null
  );
  const [metaFieldFormData, setMetaFieldFormData] = useState<{
    name: string;
    label: string;
    field_type: string;
    position: number;
    required: boolean;
    visible: boolean;
  }>({
    name: "",
    label: "",
    field_type: "text",
    position: 0,
    required: false,
    visible: true,
  });
  const [loadingMetaFields, setLoadingMetaFields] = useState(false);
  const [isMetaFieldFormOpen, setIsMetaFieldFormOpen] = useState(false);

  // ─── ✅ ÉTATS POUR L'AJOUT MULTIPLE ────────────────────────
  const [metaFieldRows, setMetaFieldRows] = useState<MetaFieldFormRow[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // ─── Pagination MetaFields ──────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalMetaFields = metaFields.length;
  const totalPages = Math.ceil(totalMetaFields / itemsPerPage);
  const paginatedMetaFields = metaFields.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── Chargement des données ──────────────────────────────────
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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTypeId]);

  // ─── CRUD Type ──────────────────────────────────────────────
  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      const data = {
        nom: typeFormData.nom,
        code: typeFormData.code || typeFormData.nom.toUpperCase(),
        description: typeFormData.description,
      };

      let typeId: number;

      if (editingType) {
        await updateType(editingType.id, data);
        typeId = editingType.id;
        setSuccess(`✅ Type "${data.nom}" mis à jour avec succès !`);
      } else {
        const result = await createType(data);
        typeId = result.data.id;
        setSuccess(`✅ Type "${data.nom}" créé avec succès !`);
      }

      if (typeFormData.agence_ids && typeFormData.agence_ids.length > 0) {
        await assignTypeToAgences(typeId, typeFormData.agence_ids);
      }

      closeTypeModal();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleDeleteType = async (id: number, nom: string) => {
    if (!window.confirm(`Voulez-vous désactiver le type "${nom}" ?`)) return;
    try {
      await deleteType(id);
      setSuccess(`✅ Type "${nom}" désactivé`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const openTypeModal = (type?: TypeDocument) => {
    if (type) {
      setEditingType(type);
      setTypeFormData({
        nom: type.nom,
        code: type.code || "",
        description: type.description || "",
        agence_ids: type.agence_ids || [],
      });
    } else {
      setEditingType(null);
      setTypeFormData({
        nom: "",
        code: "",
        description: "",
        agence_ids: agenceId ? [agenceId] : [],
      });
    }
    setError("");
    setIsTypeModalOpen(true);
  };

  const closeTypeModal = () => {
    setIsTypeModalOpen(false);
    setEditingType(null);
    setTypeFormData({ nom: "", code: "", description: "", agence_ids: [] });
  };

  const toggleAgence = (agenceId: number) => {
    setTypeFormData((prev) => ({
      ...prev,
      agence_ids: prev.agence_ids.includes(agenceId)
        ? prev.agence_ids.filter((id) => id !== agenceId)
        : [...prev.agence_ids, agenceId],
    }));
  };

  // ─── CRUD MetaField ──────────────────────────────────────────
  const loadMetaFields = async (typeId: number, typeNom: string) => {
    setSelectedTypeId(typeId);
    setSelectedTypeNom(typeNom);
    setLoadingMetaFields(true);
    try {
      const response = await getMetaFieldsByType(typeId);
      setMetaFields(response.data || []);
      setIsMetaFieldModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement des champs");
    } finally {
      setLoadingMetaFields(false);
    }
  };

  const handleMetaFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) return;
    try {
      setError("");
      setSuccess("");

      const data = {
        name: metaFieldFormData.name,
        label: metaFieldFormData.label,
        field_type: metaFieldFormData.field_type,
        position: metaFieldFormData.position,
        required: metaFieldFormData.required,
        visible: metaFieldFormData.visible,
      };

      if (editingMetaField) {
        await updateMetaField(editingMetaField.id, data);
        setSuccess(`✅ Champ "${data.label}" mis à jour avec succès !`);
      } else {
        await createMetaField(selectedTypeId, data);
        setSuccess(`✅ Champ "${data.label}" créé avec succès !`);
      }

      closeMetaFieldForm();
      await loadMetaFields(selectedTypeId, selectedTypeNom);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleDeleteMetaField = async (id: number, label: string) => {
    if (!window.confirm(`Voulez-vous supprimer le champ "${label}" ?`)) return;
    try {
      await deleteMetaField(id);
      setSuccess(`✅ Champ "${label}" supprimé`);
      if (selectedTypeId) {
        await loadMetaFields(selectedTypeId, selectedTypeNom);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const openMetaFieldForm = (metaField?: MetaField) => {
    if (metaField) {
      setEditingMetaField(metaField);
      setMetaFieldFormData({
        name: metaField.name,
        label: metaField.label || metaField.name,
        field_type: metaField.field_type || "text",
        position: metaField.position || 0,
        required: metaField.required || false,
        visible: metaField.visible !== undefined ? metaField.visible : true,
      });
    } else {
      setEditingMetaField(null);
      const nextPosition = metaFields.length;
      setMetaFieldFormData({
        name: "",
        label: "",
        field_type: "text",
        position: nextPosition + 1,
        required: false,
        visible: true,
      });
    }
    setError("");
    setIsMetaFieldFormOpen(true);
  };

  const closeMetaFieldForm = () => {
    setIsMetaFieldFormOpen(false);
    setEditingMetaField(null);
    setMetaFieldFormData({
      name: "",
      label: "",
      field_type: "text",
      position: 0,
      required: false,
      visible: true,
    });
  };

  const closeMetaFieldModal = () => {
    setIsMetaFieldModalOpen(false);
    setSelectedTypeId(null);
    setMetaFields([]);
    closeMetaFieldForm();
    cancelBatch();
  };

  // ─── ✅ AJOUT MULTIPLE DE METAFIELDS ────────────────────────
  const addRow = () => {
    const nextPosition = metaFieldRows.length + metaFields.length + 1;
    setMetaFieldRows([
      ...metaFieldRows,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        name: "",
        label: "",
        field_type: "text",
        position: nextPosition,
        required: false,
        visible: true,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setMetaFieldRows(metaFieldRows.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, field: keyof MetaFieldFormRow, value: any) => {
    setMetaFieldRows(
      metaFieldRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleBatchSubmit = async () => {
    if (!selectedTypeId) return;

    const validRows = metaFieldRows.filter(
      (row) => row.name.trim() && row.label.trim()
    );

    if (validRows.length === 0) {
      setError("Veuillez remplir au moins un champ");
      return;
    }

    setSubmittingBatch(true);
    setError("");

    try {
      const fieldsToCreate = validRows.map((row) => ({
        name: row.name.trim().toLowerCase().replace(/\s/g, "_"),
        label: row.label.trim(),
        field_type: row.field_type,
        position: row.position || 1,
        required: row.required || false,
        visible: row.visible !== undefined ? row.visible : true,
      }));

      const response = await createMetaFieldsBatch(selectedTypeId, fieldsToCreate);

      setSuccess(`✅ ${response.count} champ(s) créé(s) avec succès !`);
      setMetaFieldRows([]);
      setIsBatchMode(false);
      await loadMetaFields(selectedTypeId, selectedTypeNom);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la création en batch");
    } finally {
      setSubmittingBatch(false);
    }
  };

  const openBatchMode = () => {
    setIsBatchMode(true);
    const nextPosition = metaFields.length + 1;
    setMetaFieldRows([
      {
        id: `row-${Date.now()}-${Math.random()}`,
        name: "",
        label: "",
        field_type: "text",
        position: nextPosition,
        required: false,
        visible: true,
      },
    ]);
  };

  const cancelBatch = () => {
    setIsBatchMode(false);
    setMetaFieldRows([]);
    setError("");
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
      {/* ─── EN-TÊTE ───────────────────────────────────────────── */}
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
          onClick={() => openTypeModal()}
          className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
        >
          <span className="text-lg font-bold">+</span> Nouveau type
        </button>
      </div>

      {/* ─── MESSAGES ──────────────────────────────────────────── */}
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

      {/* ─── TABLEAU TYPES ────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Code</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Nom</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Agences</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Statut</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-accent">{type.code}</td>
                <td className="px-4 py-3">{type.nom}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {type.agence_noms && type.agence_noms.length > 0 ? (
                      type.agence_noms.map((nom, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-mono border border-blue-200">
                          {nom}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-xs">Aucune</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                    type.active
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                  }`}>
                    {type.active ? "🟢 Actif" : "🔴 Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => openTypeModal(type)} className="text-blue-600 hover:text-blue-800 text-xs font-mono px-2 py-1 rounded hover:bg-blue-50">
                      ✏️ Modifier
                    </button>
                    <button onClick={() => loadMetaFields(type.id, type.nom)} className="text-purple-600 hover:text-purple-800 text-xs font-mono px-2 py-1 rounded hover:bg-purple-50">
                      📋 Champs
                    </button>
                    {type.active ? (
                      <button onClick={() => handleDeleteType(type.id, type.nom)} className="text-red-600 hover:text-red-800 text-xs font-mono px-2 py-1 rounded hover:bg-red-50">
                        🗑️ Désactiver
                      </button>
                    ) : (
                      <button onClick={() => { if (window.confirm(`Réactiver "${type.nom}" ?`)) { updateType(type.id, { active: true }).then(() => loadData()); } }} className="text-emerald-600 hover:text-emerald-800 text-xs font-mono px-2 py-1 rounded hover:bg-emerald-50">
                        🔄 Réactiver
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted font-mono">
                  <div className="text-4xl mb-3">📭</div>
                  Aucun type de document<br />
                  <span className="text-xs">Cliquez sur "Nouveau type" pour commencer</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL TYPE ────────────────────────────────────────── */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeTypeModal}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">
                {editingType ? "✏️ Modifier le type" : "📄 Nouveau type de document"}
              </h3>
              <button onClick={closeTypeModal} className="text-muted hover:text-primary text-xl">✕</button>
            </div>
            <form onSubmit={handleTypeSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                  Code <span className="text-accent">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={typeFormData.code}
                  onChange={(e) => setTypeFormData({ ...typeFormData, code: e.target.value.toUpperCase() })}
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm uppercase"
                  placeholder="CODE (ex: PDC)"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                  Nom * <span className="text-accent">(ex: Pièces de caisse)</span>
                </label>
                <input
                  type="text"
                  value={typeFormData.nom}
                  onChange={(e) => setTypeFormData({ ...typeFormData, nom: e.target.value })}
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm"
                  placeholder="Nom du type"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">Description</label>
                <textarea
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm resize-none"
                  placeholder="Description optionnelle..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-muted mb-2 font-semibold">
                  Agences <span className="text-accent">(sélection multiple)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border rounded p-2 bg-surface">
                  {agences.map((agence) => (
                    <label key={agence.id} className="flex items-center gap-2 font-mono text-sm cursor-pointer hover:bg-white px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={agence.id !== undefined && typeFormData.agence_ids.includes(agence.id)}
                        onChange={() => agence.id !== undefined && toggleAgence(agence.id)}
                        className="w-4 h-4 accent-accent"
                      />
                      <span>{agence.nom}</span>
                    </label>
                  ))}
                  {agences.length === 0 && (
                    <span className="col-span-2 text-center text-muted text-xs py-2">Aucune agence disponible</span>
                  )}
                </div>
                <p className="text-xs text-muted mt-1">
                  {typeFormData.agence_ids.length} agence{typeFormData.agence_ids.length > 1 ? "s" : ""} sélectionnée{typeFormData.agence_ids.length > 1 ? "s" : ""}
                </p>
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">❌ {error}</div>}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-accent hover:bg-red-700 text-white py-2.5 rounded font-mono text-sm transition-colors">
                  {editingType ? "💾 Mettre à jour" : "✨ Créer"}
                </button>
                <button type="button" onClick={closeTypeModal} className="flex-1 bg-surface hover:bg-border text-primary py-2.5 rounded font-mono text-sm transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL METAFIELDS (liste) ──────────────────────────── */}
      {isMetaFieldModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeMetaFieldModal}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">📋 Champs - {selectedTypeNom}</h3>
              <button onClick={closeMetaFieldModal} className="text-muted hover:text-primary text-xl">✕</button>
            </div>

            {/* ✅ Boutons : Ajout simple ou multiple */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setEditingMetaField(null);
                  setIsMetaFieldFormOpen(true);
                }}
                className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
              >
                <span className="text-lg font-bold">+</span> Ajouter un champ
              </button>
              <button
                onClick={openBatchMode}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
              >
                <span className="text-lg font-bold">++</span> Ajouter plusieurs
              </button>
            </div>

            {loadingMetaFields ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-surface border-b border-border">
                        <th className="px-3 py-2 text-left font-mono text-[10px] text-muted uppercase">Nom</th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] text-muted uppercase">Label</th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] text-muted uppercase">Type</th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] text-muted uppercase">Position</th>
                        <th className="px-3 py-2 text-left font-mono text-[10px] text-muted uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMetaFields.map((mf) => (
                        <tr key={mf.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                          <td className="px-3 py-2 font-mono text-xs">{mf.name}</td>
                          <td className="px-3 py-2">{mf.label}</td>
                          <td className="px-3 py-2">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-mono">{mf.field_type}</span>
                          </td>
                          <td className="px-3 py-2 text-center">{mf.position}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingMetaField(mf); setIsMetaFieldFormOpen(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-mono px-2 py-1 rounded hover:bg-blue-50">✏️</button>
                              <button onClick={() => handleDeleteMetaField(mf.id, mf.label)} className="text-red-600 hover:text-red-800 text-xs font-mono px-2 py-1 rounded hover:bg-red-50">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {metaFields.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted font-mono">
                            <div className="text-4xl mb-3">📭</div>
                            Aucun champ pour ce type<br />
                            <span className="text-xs">Cliquez sur "Ajouter un champ" ou "Ajouter plusieurs" pour commencer</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-border rounded text-sm font-mono disabled:opacity-50 hover:bg-surface transition-colors">◀</button>
                    <span className="text-sm font-mono">Page {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-border rounded text-sm font-mono disabled:opacity-50 hover:bg-surface transition-colors">▶</button>
                  </div>
                )}
              </>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={closeMetaFieldModal} className="bg-surface hover:bg-border text-primary px-4 py-2 rounded font-mono text-sm transition-colors">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL METAFIELD FORM (simple) ────────────────────── */}
      {isMetaFieldFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setIsMetaFieldFormOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">
                {editingMetaField ? "✏️ Modifier le champ" : "➕ Ajouter un champ"}
              </h3>
              <button onClick={() => setIsMetaFieldFormOpen(false)} className="text-muted hover:text-primary text-xl">✕</button>
            </div>
            <form onSubmit={handleMetaFieldSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">Nom * <span className="text-accent">(identifiant technique)</span></label>
                <input type="text" value={metaFieldFormData.name} onChange={(e) => setMetaFieldFormData({ ...metaFieldFormData, name: e.target.value.toLowerCase().replace(/\s/g, "_") })} className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm" placeholder="montant" required />
              </div>
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">Label * <span className="text-accent">(affiché sur l'étiquette)</span></label>
                <input type="text" value={metaFieldFormData.label} onChange={(e) => setMetaFieldFormData({ ...metaFieldFormData, label: e.target.value })} className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm" placeholder="Montant" required />
              </div>
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">Type *</label>
                <select value={metaFieldFormData.field_type} onChange={(e) => setMetaFieldFormData({ ...metaFieldFormData, field_type: e.target.value })} className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm">
                  <option value="text">📝 Texte</option>
                  <option value="number">🔢 Nombre</option>
                  <option value="date">📅 Date</option>
                  <option value="textarea">📄 Zone de texte</option>
                  <option value="select">📋 Sélection</option>
                  <option value="boolean">✅ Booléen</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-muted mb-1 font-semibold">Position</label>
                  <input type="number" value={metaFieldFormData.position} onChange={(e) => setMetaFieldFormData({ ...metaFieldFormData, position: parseInt(e.target.value) || 0 })} className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm" min="1" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 font-mono text-sm cursor-pointer">
                    <input type="checkbox" checked={metaFieldFormData.required} onChange={(e) => setMetaFieldFormData({ ...metaFieldFormData, required: e.target.checked })} className="w-4 h-4 accent-accent" /> Obligatoire
                  </label>
                  <label className="flex items-center gap-2 font-mono text-sm cursor-pointer">
                    <input type="checkbox" checked={metaFieldFormData.visible} onChange={(e) => setMetaFieldFormData({ ...metaFieldFormData, visible: e.target.checked })} className="w-4 h-4 accent-accent" /> Visible
                  </label>
                </div>
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">❌ {error}</div>}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-accent hover:bg-red-700 text-white py-2.5 rounded font-mono text-sm transition-colors">{editingMetaField ? "💾 Mettre à jour" : "✨ Créer"}</button>
                <button type="button" onClick={() => setIsMetaFieldFormOpen(false)} className="flex-1 bg-surface hover:bg-border text-primary py-2.5 rounded font-mono text-sm transition-colors">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ✅ MODAL BATCH (AJOUT MULTIPLE) ──────────────────── */}
      {isBatchMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={cancelBatch}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary">➕ Ajouter plusieurs champs</h3>
              <button onClick={cancelBatch} className="text-muted hover:text-primary text-xl">✕</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="px-2 py-2 text-left font-mono text-[10px] text-muted uppercase">Nom</th>
                    <th className="px-2 py-2 text-left font-mono text-[10px] text-muted uppercase">Label</th>
                    <th className="px-2 py-2 text-left font-mono text-[10px] text-muted uppercase">Type</th>
                    <th className="px-2 py-2 text-left font-mono text-[10px] text-muted uppercase">Pos.</th>
                    <th className="px-2 py-2 text-left font-mono text-[10px] text-muted uppercase">Req.</th>
                    <th className="px-2 py-2 text-left font-mono text-[10px] text-muted uppercase">Vis.</th>
                    <th className="px-2 py-2 text-left font-mono text-[10px] text-muted uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {metaFieldRows.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="px-2 py-1">
                        <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)} className="w-full border border-border px-2 py-1 rounded font-mono text-xs focus:outline-none focus:border-accent" placeholder="montant" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" value={row.label} onChange={(e) => updateRow(row.id, "label", e.target.value)} className="w-full border border-border px-2 py-1 rounded font-mono text-xs focus:outline-none focus:border-accent" placeholder="Montant" />
                      </td>
                      <td className="px-2 py-1">
                        <select value={row.field_type} onChange={(e) => updateRow(row.id, "field_type", e.target.value)} className="w-full border border-border px-2 py-1 rounded font-mono text-xs focus:outline-none focus:border-accent">
                          <option value="text">Texte</option>
                          <option value="number">Nombre</option>
                          <option value="date">Date</option>
                          <option value="textarea">Zone texte</option>
                          <option value="select">Sélection</option>
                          <option value="boolean">Booléen</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={row.position} onChange={(e) => updateRow(row.id, "position", parseInt(e.target.value) || 1)} className="w-16 border border-border px-2 py-1 rounded font-mono text-xs focus:outline-none focus:border-accent" min="1" />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input type="checkbox" checked={row.required} onChange={(e) => updateRow(row.id, "required", e.target.checked)} className="w-4 h-4 accent-accent" />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input type="checkbox" checked={row.visible} onChange={(e) => updateRow(row.id, "visible", e.target.checked)} className="w-4 h-4 accent-accent" />
                      </td>
                      <td className="px-2 py-1">
                        <button onClick={() => removeRow(row.id)} className="text-red-600 hover:text-red-800 text-sm px-1 py-1 rounded hover:bg-red-50">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={addRow} className="mt-3 text-blue-600 hover:text-blue-800 font-mono text-sm px-3 py-1 rounded hover:bg-blue-50 transition-colors flex items-center gap-1">
              <span className="text-lg font-bold">+</span> Ajouter une ligne
            </button>

            {error && <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">❌ {error}</div>}

            <div className="flex gap-3 mt-4">
              <button onClick={handleBatchSubmit} disabled={submittingBatch || metaFieldRows.length === 0} className="flex-1 bg-accent hover:bg-red-700 disabled:bg-border disabled:text-muted text-white py-2.5 rounded font-mono text-sm transition-colors">
                {submittingBatch ? "⏳ Création..." : `✅ Créer ${metaFieldRows.filter(r => r.name.trim() && r.label.trim()).length} champ(s)`}
              </button>
              <button onClick={cancelBatch} className="flex-1 bg-surface hover:bg-border text-primary py-2.5 rounded font-mono text-sm transition-colors">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypeDocumentManager;