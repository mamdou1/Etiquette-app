import React, { useState, useEffect } from "react";
import { 
  searchArchives, 
  getDocumentTypes, 
  getAnnees,
  deleteArchive,
  Archive 
} from "../services/archiveService";

const RecherchePage: React.FC = () => {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [annees, setAnnees] = useState<string[]>([]);
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
      const response = await searchArchives(filters);
      if (response.success) {
        setArchives(response.data);
        setSuccess(`✅ ${response.count} résultat${response.count > 1 ? "s" : ""} trouvé${response.count > 1 ? "s" : ""}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette archive ?")) return;
    try {
      const success = await deleteArchive(id);
      if (success) {
        setSuccess("✅ Archive supprimée avec succès");
        handleSearch();
      }
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

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">🔍 Recherche d'archives</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Recherchez par type de document, année, agence ou numéro de boîte
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
          <div className="flex gap-3">
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

      {/* Résultats */}
      {archives.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">N° Boîte</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Agence</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Année</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {archives.map((archive) => (
                  <tr key={archive.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-accent">{archive.numero_boite}</td>
                    <td className="px-4 py-3 font-medium">{archive.agence_nom}</td>
                    <td className="px-4 py-3 text-sm">{archive.type_document}</td>
                    <td className="px-4 py-3 text-xs text-muted font-mono">{archive.date_production}</td>
                    <td className="px-4 py-3 text-xs font-mono">{archive.annee}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        archive.source === "base_donnees" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-green-100 text-green-700"
                      }`}>
                        {archive.source === "base_donnees" ? "📦 Base" : "📤 Upload"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(archive.id!)}
                        className="text-red-600 hover:text-red-800 text-xs font-mono px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-surface border-t border-border text-xs text-muted font-mono">
            {archives.length} enregistrement{archives.length > 1 ? "s" : ""}
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
    </div>
  );
};

export default RecherchePage;