import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  search, 
  getFilterOptions, 
  SearchFilters, 
  AgenceResult,
  Boite,
  FilterOptions 
} from '../services/searchService';

// ✅ Icônes SVG inline
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ✅ Helper : extraire Rayon et Travers depuis metaValues
const extractLocation = (metaValues: Record<string, any>) => {
  if (!metaValues) return { rayon: '', travers: '' };
  
  let rayon = '';
  let travers = '';
  
  Object.entries(metaValues).forEach(([key, val]) => {
    const keyLower = key.toLowerCase();
    const value = (val as any)?.value || '';
    
    if (keyLower.includes('rayon') && !rayon) {
      rayon = value;
    }
    if (keyLower.includes('travers') && !travers) {
      travers = value;
    }
  });
  
  return { rayon, travers };
};

const RecherchePage: React.FC = () => {
  const { setVisibleFields } = useSettings();

  // ─── États ──────────────────────────────────────────────────
  const [filters, setFilters] = useState<SearchFilters>({
    agence: '',
    type: '',
    annee: '',
    numero_boite: '',
    valeur: '',
    rayon: '',
    travers: '',
    date_debut: '',
    date_fin: '',
  });
  const [results, setResults] = useState<AgenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    agences: [],
    types: [],
    annees: [],
    rayons: [],
    travers: [],
  });
  // ─── PAGINATION ──────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(total / itemsPerPage);
  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─── États d'expansion ──────────────────────────────────────
  const [expandedAgence, setExpandedAgence] = useState<number | null>(null);
  const [expandedType, setExpandedType] = useState<number | null>(null);
  const [expandedAnnee, setExpandedAnnee] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ─── Chargement des filtres ─────────────────────────────────
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await getFilterOptions();
        if (response.success) {
          setFilterOptions({
            agences: response.data.agences || [],
            types: response.data.types || [],
            annees: response.data.annees || [],
            rayons: response.data.rayons || [],
            travers: response.data.travers || [],
          });
        }
      } catch (error) {
        console.error('Erreur chargement filtres:', error);
      }
    };
    loadFilters();
  }, []);

  // ─── Recherche ──────────────────────────────────────────────
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setCurrentPage(1);
    try {
      const cleanFilters: SearchFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          cleanFilters[key as keyof SearchFilters] = value.trim();
        }
      });

      const response = await search(cleanFilters);
      if (response.success) {
        setResults(response.data);
        setTotal(response.count);
        setVisibleFields(['numero_boite', 'agence_nom', 'type_document', 'caissiers', 'annee']);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Réinitialiser ──────────────────────────────────────────
  const resetFilters = () => {
    setFilters({
      agence: '',
      type: '',
      annee: '',
      numero_boite: '',
      valeur: '',
      rayon: '',
      travers: '',
      date_debut: '',
      date_fin: '',
    });
    setResults([]);
    setTotal(0);
    setCurrentPage(1);
    setExpandedAgence(null);
    setExpandedType(null);
    setExpandedAnnee(null);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v.trim() !== '').length;

  return (
    <div className="w-full">
      {/* ─── EN-TÊTE ──────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">🔍 Recherche d'archives</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Recherchez des boîtes par agence, type, année, emplacement ou dates
        </p>
      </div>

      {/* ─── BARRE DE RECHERCHE ────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">Agence</label>
              <select
                value={filters.agence || ''}
                onChange={(e) => setFilters({ ...filters, agence: e.target.value })}
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              >
                <option value="">Toutes les agences</option>
                {filterOptions.agences.map((agence) => (
                  <option key={agence.id} value={agence.nom}>
                    {agence.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">Type de document</label>
              <select
                value={filters.type || ''}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              >
                <option value="">Tous les types</option>
                {filterOptions.types.map((type) => (
                  <option key={type.id} value={type.nom}>
                    {type.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">Année</label>
              <select
                value={filters.annee || ''}
                onChange={(e) => setFilters({ ...filters, annee: e.target.value })}
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              >
                <option value="">Toutes les années</option>
                {filterOptions.annees.map((annee) => (
                  <option key={annee} value={annee}>
                    {annee}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">N° de boîte</label>
              <input
                type="text"
                value={filters.numero_boite || ''}
                onChange={(e) => setFilters({ ...filters, numero_boite: e.target.value })}
                placeholder="Ex: BOX-001..."
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-mono text-xs text-muted mb-1 font-semibold">Valeur (champ)</label>
              <input
                type="text"
                value={filters.valeur || ''}
                onChange={(e) => setFilters({ ...filters, valeur: e.target.value })}
                placeholder="Rechercher dans les valeurs..."
                className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
              />
            </div>
          </div>

          {/* Bouton filtres avancés */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-accent hover:text-red-700 font-mono text-sm flex items-center gap-2 transition-colors"
            >
              <span>{showAdvancedFilters ? '▼' : '▶'}</span>
              Filtres avancés (Rayon, Travers, Dates)
              {!showAdvancedFilters && (filters.rayon || filters.travers || filters.date_debut || filters.date_fin) && (
                <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                  {[filters.rayon, filters.travers, filters.date_debut, filters.date_fin].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-surface rounded border border-border">
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">📍 Rayon</label>
                <select
                  value={filters.rayon || ''}
                  onChange={(e) => setFilters({ ...filters, rayon: e.target.value })}
                  className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
                >
                  <option value="">Tous les rayons</option>
                  {filterOptions.rayons.map((rayon) => (
                    <option key={rayon} value={rayon}>
                      {rayon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">📚 Travers</label>
                <select
                  value={filters.travers || ''}
                  onChange={(e) => setFilters({ ...filters, travers: e.target.value })}
                  className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
                >
                  <option value="">Tous les travers</option>
                  {filterOptions.travers.map((travers) => (
                    <option key={travers} value={travers}>
                      {travers}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">📅 Date de début</label>
                <input
                  type="date"
                  value={filters.date_debut || ''}
                  onChange={(e) => setFilters({ ...filters, date_debut: e.target.value })}
                  max={filters.date_fin || undefined}
                  className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">📅 Date de fin</label>
                <input
                  type="date"
                  value={filters.date_fin || ''}
                  onChange={(e) => setFilters({ ...filters, date_fin: e.target.value })}
                  min={filters.date_debut || undefined}
                  className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:border-accent font-mono text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:bg-red-700 disabled:bg-border disabled:cursor-not-allowed text-white px-6 py-2.5 rounded font-mono text-sm transition-colors flex items-center gap-2"
            >
              <SearchIcon />
              {loading ? '⏳ Recherche...' : '🔍 Rechercher'}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="bg-surface hover:bg-border text-primary px-6 py-2.5 rounded font-mono text-sm transition-colors"
            >
              Réinitialiser
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <div className="text-xs text-muted font-mono flex flex-wrap gap-2">
              <span className="font-semibold">Filtres actifs ({activeFiltersCount}) :</span>
              {filters.agence && <span className="bg-surface px-2 py-1 rounded">🏢 {filters.agence}</span>}
              {filters.type && <span className="bg-surface px-2 py-1 rounded">📄 {filters.type}</span>}
              {filters.annee && <span className="bg-surface px-2 py-1 rounded">📅 {filters.annee}</span>}
              {filters.numero_boite && <span className="bg-surface px-2 py-1 rounded">📦 {filters.numero_boite}</span>}
              {filters.valeur && <span className="bg-surface px-2 py-1 rounded">🔍 {filters.valeur}</span>}
              {filters.rayon && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">📍 Rayon: {filters.rayon}</span>}
              {filters.travers && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">📚 Travers: {filters.travers}</span>}
              {filters.date_debut && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Du: {filters.date_debut}</span>}
              {filters.date_fin && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Au: {filters.date_fin}</span>}
            </div>
          )}
        </form>
      </div>

      {/* ─── RÉSULTATS ────────────────────────────────────────── */}
      {paginatedResults.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted font-mono">
              {total} boîte{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}
            </p>
          </div>

          {/* Résultats hiérarchiques */}
          <div className="space-y-4">
            {paginatedResults.map((result) => {
              const isAgenceExpanded = expandedAgence === result.id;

              return (
                <div key={result.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Agence */}
                  <div
                    className="flex items-center justify-between p-4 bg-surface hover:bg-surface/80 cursor-pointer transition-colors"
                    onClick={() => setExpandedAgence(isAgenceExpanded ? null : result.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏢</span>
                      <div>
                        <span className="font-bold text-primary">{result.nom}</span>
                        <span className="ml-3 text-sm text-muted font-mono">
                          {result.total_boites} boîtes • {result.total_documents} documents
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted">{isAgenceExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {/* Types */}
                  {isAgenceExpanded && (
                    <div className="p-4 pl-10 space-y-3 bg-white">
                      {result.types.map((type) => {
                        const isTypeExpanded = expandedType === type.id;

                        return (
                          <div key={type.id} className="border-l-2 border-border pl-4">
                            <div
                              className="flex items-center justify-between p-3 hover:bg-surface/50 rounded cursor-pointer transition-colors"
                              onClick={() => setExpandedType(isTypeExpanded ? null : type.id)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">📄</span>
                                <div>
                                  <span className="font-medium">{type.nom}</span>
                                  <span className="ml-3 text-sm text-muted font-mono">
                                    {type.total_boites} boîtes • {type.total_documents} documents
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-muted text-sm">{isTypeExpanded ? '▼' : '▶'}</span>
                              </div>
                            </div>

                            {/* Années */}
                            {isTypeExpanded && (
                              <div className="ml-6 mt-2 space-y-2">
                                {type.annees.map((annee) => {
                                  const key = `${type.id}-${annee.annee}`;
                                  const isAnneeExpanded = expandedAnnee === key;

                                  return (
                                    <div key={annee.annee} className="border-l-2 border-border pl-4">
                                      <div
                                        className="flex items-center justify-between p-2 hover:bg-surface/50 rounded cursor-pointer transition-colors"
                                        onClick={() => setExpandedAnnee(isAnneeExpanded ? null : key)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-lg">{isAnneeExpanded ? '📅' : '📆'}</span>
                                          <div>
                                            <span className="font-mono font-medium text-accent">{annee.annee}</span>
                                            <span className="ml-3 text-sm text-muted font-mono">
                                              {annee.total_boites} boîtes • {annee.total_documents} documents
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-muted text-sm">{isAnneeExpanded ? '▼' : '▶'}</span>
                                        </div>
                                      </div>

                                      {/* ✅ Boîtes avec EMPLACEMENT BIEN VISIBLE */}
                                      {isAnneeExpanded && (
                                        <div className="ml-6 mt-2 space-y-3">
                                          {annee.boites.map((boite) => {
                                            const { rayon, travers } = extractLocation(boite.metaValues);
                                            
                                            // Autres metaValues (sans rayon/travers)
                                            const otherMeta = Object.entries(boite.metaValues || {})
                                              .filter(([k]) => {
                                                const kl = k.toLowerCase();
                                                return !kl.includes('rayon') && !kl.includes('travers');
                                              });

                                            return (
                                              <div
                                                key={boite.numero_boite}
                                                className="bg-white rounded-lg border-2 border-border hover:border-accent/50 transition-colors overflow-hidden"
                                              >
                                                {/* En-tête : N° boîte */}
                                                <div className="flex items-center justify-between p-3 bg-surface/30 border-b border-border">
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-xl">📦</span>
                                                    <span className="font-mono font-bold text-lg text-primary">
                                                      {boite.numero_boite}
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* ✅ EMPLACEMENT EN GRAND */}
                                                {(rayon || travers) ? (
                                                  <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 p-4 border-b border-border">
                                                    <p className="text-[10px] text-muted font-mono uppercase tracking-widest mb-2 font-bold">
                                                      📍 Emplacement physique
                                                    </p>
                                                    <div className="flex gap-8 items-center">
                                                      {rayon && (
                                                        <div className="flex items-baseline gap-2">
                                                          <span className="text-xs text-muted font-mono font-semibold">
                                                            RAYON
                                                          </span>
                                                          <span className="text-4xl font-extrabold text-blue-600 font-mono leading-none">
                                                            {rayon}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {travers && (
                                                        <div className="flex items-baseline gap-2">
                                                          <span className="text-xs text-muted font-mono font-semibold">
                                                            TRAVERS
                                                          </span>
                                                          <span className="text-4xl font-extrabold text-purple-600 font-mono leading-none">
                                                            {travers}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="bg-amber-50 p-3 border-b border-border">
                                                    <p className="text-xs text-amber-700 font-mono">
                                                      ⚠️ Aucun emplacement enregistré
                                                    </p>
                                                  </div>
                                                )}

                                                {/* Autres informations */}
                                                {otherMeta.length > 0 && (
                                                  <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                                                    {otherMeta.map(([key, val]) => (
                                                      <div key={key} className="flex flex-col">
                                                        <span className="text-[10px] text-muted uppercase tracking-wide">
                                                          {(val as any).label || key}
                                                        </span>
                                                        <span className="font-medium text-primary truncate">
                                                          {(val as any).value || '—'}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── PAGINATION ────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-border rounded text-sm font-mono disabled:opacity-50 hover:bg-surface transition-colors"
              >
                ◀ Précédent
              </button>
              <span className="text-sm font-mono">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-border rounded text-sm font-mono disabled:opacity-50 hover:bg-surface transition-colors"
              >
                Suivant ▶
              </button>
            </div>
          )}
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
