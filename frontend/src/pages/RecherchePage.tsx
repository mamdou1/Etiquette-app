import React, { useState, useEffect } from "react";
import { 
  getArchivesGrouped,
  getBoiteDetail,
  getDocumentTypes, 
  getAnnees,
  deleteArchive,
  deleteAllArchives,
  ArchiveGrouped,
  BoiteDetail,
  Archive
} from "../services/archiveService";

const RecherchePage: React.FC = () => {
  const [archives, setArchives] = useState<ArchiveGrouped[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [annees, setAnnees] = useState<string[]>([]);
  const [selectedBoite, setSelectedBoite] = useState<BoiteDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filters, setFilters] = useState({
    type_document: "",
    annee: "",
    agence_nom: "",
    numero_boite: "",
  });

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [typesData, anneesData] = await Promise.all([
        getDocumentTypes(),
        getAnnees(),
      ]);
      setTypes(typesData);
      setAnnees(anneesData);
    } catch (err) {
      console.error("Erreur chargement filtres:", err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await getArchivesGrouped(filters);
      if (response.success) {
        setArchives(response.data);
        setSuccess(`✅ ${response.count} boîte${response.count > 1 ? "s" : ""} trouvée${response.count > 1 ? "s" : ""}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (numeroBoite: string) => {
    setLoadingDetail(true);
    setError("");
    try {
      const response = await getBoiteDetail(numeroBoite);
      if (response.success) {
        setSelectedBoite(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement des détails");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteBox = async (archiveIds: number[]) => {
    if (!window.confirm("Voulez-vous vraiment supprimer toutes les lignes de cette boîte ?")) return;
    try {
      // Supprimer chaque archive de la boîte
      for (const id of archiveIds) {
        await deleteArchive(id);
      }
      setSuccess("✅ Boîte supprimée avec succès");
      handleSearch();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ Voulez-vous vraiment supprimer TOUTES les archives ? Cette action est irréversible.")) return;
    try {
      await deleteAllArchives();
      setSuccess("✅ Toutes les archives ont été supprimées");
      setArchives([]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const resetFilters = () => {
    setFilters({ type_document: "", annee: "", agence_nom: "", numero_boite: "" });
    setArchives([]);
    setSuccess("");
    setError("");
  };

  const closeDetail = () => {
    setSelectedBoite(null);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">🔍 Recherche d'archives</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Recherchez des boîtes par type de document, année, agence ou numéro de boîte
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-border">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">Type de document</label>
              <select
                value={filters.type_document}
                onChange={(e) => setFilters({ ...filters, type_document: e.target.value })}
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              >
                <option value="">Tous les types</option>
                {types.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">Année</label>
              <select
                value={filters.annee}
                onChange={(e) => setFilters({ ...filters, annee: e.target.value })}
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              >
                <option value="">Toutes les années</option>
                {annees.map((annee) => (
                  <option key={annee} value={annee}>{annee}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">Agence</label>
              <input
                type="text"
                value={filters.agence_nom}
                onChange={(e) => setFilters({ ...filters, agence_nom: e.target.value })}
                placeholder="Nom de l'agence..."
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">N° de boîte</label>
              <input
                type="text"
                value={filters.numero_boite}
                onChange={(e) => setFilters({ ...filters, numero_boite: e.target.value })}
                placeholder="Ex: BOX-001..."
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:bg-red-700 disabled:bg-border disabled:cursor-not-allowed text-white px-6 py-2.5 rounded font-mono text-sm transition-colors flex items-center gap-2"
            >
              {loading ? "⏳ Recherche..." : "🔍 Rechercher"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="bg-surface hover:bg-border text-primary px-6 py-2.5 rounded font-mono text-sm transition-colors"
            >
              Réinitialiser
            </button>
            {archives.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="bg-red-100 hover:bg-red-200 text-red-600 px-6 py-2.5 rounded font-mono text-sm transition-colors ml-auto"
              >
                🗑️ Tout supprimer
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-center gap-2">
          <span>❌</span> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <span>✅</span> {success}
        </div>
      )}

      {/* Résultats - Groupés par boîte */}
      {archives.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">N° Boîte</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Agence</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Type(s)</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Caissiers</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Année(s)</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Période</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Docs</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {archives.map((archive) => (
                  <tr key={archive.numero_boite} className="border-b border-border hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-accent">{archive.numero_boite}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">{archive.agence_nom}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {archive.types_documents_list?.map((type, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-mono">
                            {type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {archive.caissiers_list?.map((caissier, i) => (
                          <span key={i} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-mono">
                            👤 {caissier}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">{archive.annees}</td>
                    <td className="px-4 py-3 text-[10px] text-muted font-mono">
                      {archive.date_debut} → {archive.date_fin}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-accent/10 text-accent text-[10px] font-mono font-bold px-2 py-1 rounded">
                        {archive.total_documents}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewDetail(archive.numero_boite)}
                          className="text-blue-600 hover:text-blue-800 text-[11px] font-mono px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          title="Voir détails"
                        >
                          📋 Détails
                        </button>
                        <button
                          onClick={() => handleDeleteBox(archive.archive_ids)}
                          className="text-red-600 hover:text-red-800 text-[11px] font-mono px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Supprimer la boîte"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-surface border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted font-mono">
              {archives.length} boîte{archives.length > 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-muted/60 font-mono">
              {archives.reduce((sum, a) => sum + a.total_documents, 0)} documents au total
            </span>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12 bg-white rounded-lg border border-border">
            <div className="text-5xl mb-4">🔎</div>
            <h3 className="text-lg font-medium text-muted">Aucun résultat</h3>
            <p className="text-sm text-muted/60 font-mono mt-1">
              Ajustez vos filtres ou importez des données pour commencer
            </p>
          </div>
        )
      )}

      {/* Modale de détails d'une boîte */}
      {selectedBoite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeDetail}>
          <div 
            className="bg-white rounded-lg shadow-2xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-primary font-mono">
                  📦 Boîte {selectedBoite.numero_boite}
                </h2>
                <p className="text-sm text-muted mt-1">
                  {selectedBoite.agence.nom}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="text-muted hover:text-primary text-2xl leading-none p-2 hover:bg-surface rounded transition-colors"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center">
                <p className="text-muted font-mono animate-pulse">⏳ Chargement des détails...</p>
              </div>
            ) : (
              <div className="px-6 py-4 space-y-6">
                {/* Statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface rounded-lg p-4 border border-border text-center">
                    <p className="text-2xl font-bold text-primary">{selectedBoite.statistiques.total_documents}</p>
                    <p className="text-[10px] text-muted font-mono mt-1">Documents</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4 border border-border text-center">
                    <p className="text-2xl font-bold text-accent">{selectedBoite.statistiques.caissiers.length}</p>
                    <p className="text-[10px] text-muted font-mono mt-1">Caissiers</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4 border border-border text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedBoite.statistiques.types_documents.length}</p>
                    <p className="text-[10px] text-muted font-mono mt-1">Types de doc.</p>
                  </div>
                  <div className="bg-surface rounded-lg p-4 border border-border text-center">
                    <p className="text-2xl font-bold text-emerald-600">{selectedBoite.statistiques.annees.length}</p>
                    <p className="text-[10px] text-muted font-mono mt-1">Années</p>
                  </div>
                </div>

                {/* Caissiers */}
                <div>
                  <h3 className="font-mono text-xs text-muted uppercase tracking-wider font-semibold mb-3">
                    👤 Caissiers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBoite.statistiques.caissiers.map((caissier, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-mono font-medium border border-emerald-200">
                        {caissier}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Types de documents */}
                <div>
                  <h3 className="font-mono text-xs text-muted uppercase tracking-wider font-semibold mb-3">
                    📄 Types de documents
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBoite.statistiques.types_documents.map((type, i) => (
                      <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-mono font-medium border border-blue-200">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Période */}
                <div>
                  <h3 className="font-mono text-xs text-muted uppercase tracking-wider font-semibold mb-3">
                    📅 Période
                  </h3>
                  <div className="bg-surface rounded-lg px-4 py-3 border border-border inline-block">
                    <span className="font-mono text-sm">
                      {selectedBoite.statistiques.periodes.debut || "N/A"} 
                      <span className="text-muted mx-2">→</span> 
                      {selectedBoite.statistiques.periodes.fin || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Observations */}
                {selectedBoite.observations.length > 0 && (
                  <div>
                    <h3 className="font-mono text-xs text-muted uppercase tracking-wider font-semibold mb-3">
                      📝 Observations
                    </h3>
                    <div className="space-y-1">
                      {selectedBoite.observations.map((obs, i) => (
                        <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm font-mono text-amber-800">
                          {obs}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Liste des documents */}
                <div>
                  <h3 className="font-mono text-xs text-muted uppercase tracking-wider font-semibold mb-3">
                    📑 Documents ({selectedBoite.documents.length})
                  </h3>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface">
                          <th className="px-3 py-2 text-left font-mono text-[9px] text-muted uppercase">Date</th>
                          <th className="px-3 py-2 text-left font-mono text-[9px] text-muted uppercase">Type</th>
                          <th className="px-3 py-2 text-left font-mono text-[9px] text-muted uppercase">Caissiers</th>
                          <th className="px-3 py-2 text-left font-mono text-[9px] text-muted uppercase">Année</th>
                          <th className="px-3 py-2 text-left font-mono text-[9px] text-muted uppercase">Observation</th>
                          <th className="px-3 py-2 text-left font-mono text-[9px] text-muted uppercase">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBoite.documents.map((doc, i) => (
                          <tr key={doc.id || i} className="border-t border-border hover:bg-surface/50">
                            <td className="px-3 py-2 font-mono">{doc.date_production}</td>
                            <td className="px-3 py-2">{doc.type_document}</td>
                            <td className="px-3 py-2 font-mono text-emerald-700">{doc.caissiers}</td>
                            <td className="px-3 py-2 font-mono">{doc.annee}</td>
                            <td className="px-3 py-2 text-muted max-w-[200px] truncate">{doc.observation || "—"}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
                                doc.source === "base_donnees" 
                                  ? "bg-blue-100 text-blue-700" 
                                  : "bg-green-100 text-green-700"
                              }`}>
                                {doc.source === "base_donnees" ? "📦 Base" : "📤 Upload"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Pied */}
            <div className="sticky bottom-0 bg-white border-t border-border px-6 py-3 flex justify-end">
              <button
                onClick={closeDetail}
                className="bg-surface hover:bg-border text-primary px-6 py-2 rounded font-mono text-sm transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecherchePage;

