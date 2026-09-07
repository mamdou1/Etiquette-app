import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  search, 
  getFilterOptions, 
  SearchFilters, 
  AgenceResult,
  TypeResult,
  Annee,
  Boite,
  FilterOptions 
} from '../services/searchService';
import PrintModal from '../components/PrintModal';

// ✅ Icônes SVG inline
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PrinterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const RecherchePage: React.FC = () => {
  const { setVisibleFields } = useSettings();

  // ─── États ──────────────────────────────────────────────────
  const [filters, setFilters] = useState<SearchFilters>({
    agence: '',
    type: '',
    annee: '',
    numero_boite: '',
    valeur: '',
  });
  const [results, setResults] = useState<AgenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    agences: [],
    types: [],
    annees: [],
  });
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    boxes: Array<{ boxNumber: string; records: any[] }>;
    title: string;
  }>({
    isOpen: false,
    boxes: [],
    title: '',
  });

  // ─── ✅ PAGINATION ──────────────────────────────────────────
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

  // ─── Chargement des filtres ─────────────────────────────────
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await getFilterOptions();
        if (response.success) {
          setFilterOptions(response.data);
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
    setCurrentPage(1); // ✅ Réinitialiser la page
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
    });
    setResults([]);
    setTotal(0);
    setCurrentPage(1);
    setExpandedAgence(null);
    setExpandedType(null);
    setExpandedAnnee(null);
  };

  // ─── Impression ─────────────────────────────────────────────
  const handlePrint = (boxes: Array<{ boxNumber: string; records: any[] }>, title: string) => {
    setPrintModal({
      isOpen: true,
      boxes,
      title,
    });
  };

  const handlePrintClose = () => {
    setPrintModal({ isOpen: false, boxes: [], title: '' });
  };

  // ─── Récupérer toutes les boîtes d'un résultat ─────────────
  const getAllBoxes = (result: AgenceResult) => {
    const boxes: Array<{ boxNumber: string; records: any[] }> = [];
    result.types.forEach((type: TypeResult) => {
      type.annees.forEach((annee: Annee) => {
        annee.boites.forEach((boite: Boite) => {
          boxes.push({
            boxNumber: boite.numero_boite,
            records: [{
              numero_boite: boite.numero_boite,
              agence_nom: result.nom,
              type_document: type.nom,
              annee: annee.annee,
              metaValues: boite.metaValues,
            }],
          });
        });
      });
    });
    return boxes;
  };

  const getBoxesByType = (result: AgenceResult, type: TypeResult) => {
    const boxes: Array<{ boxNumber: string; records: any[] }> = [];
    type.annees.forEach((annee: Annee) => {
      annee.boites.forEach((boite: Boite) => {
        boxes.push({
          boxNumber: boite.numero_boite,
          records: [{
            numero_boite: boite.numero_boite,
            agence_nom: result.nom,
            type_document: type.nom,
            annee: annee.annee,
            metaValues: boite.metaValues,
          }],
        });
      });
    });
    return boxes;
  };

  const getBoxesByAnnee = (result: AgenceResult, type: TypeResult, annee: Annee) => {
    return annee.boites.map((boite: Boite) => ({
      boxNumber: boite.numero_boite,
      records: [{
        numero_boite: boite.numero_boite,
        agence_nom: result.nom,
        type_document: type.nom,
        annee: annee.annee,
        metaValues: boite.metaValues,
      }],
    }));
  };

  return (
    <div className="w-full">
      {/* ─── EN-TÊTE ──────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">🔍 Recherche d'archives</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Recherchez des boîtes par agence, type de document, année ou valeur
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

            <div>
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

          {Object.values(filters).some(v => v && v.trim() !== '') && (
            <div className="text-xs text-muted font-mono flex flex-wrap gap-2">
              <span className="font-semibold">Filtres actifs :</span>
              {filters.agence && <span className="bg-surface px-2 py-1 rounded">Agence: {filters.agence}</span>}
              {filters.type && <span className="bg-surface px-2 py-1 rounded">Type: {filters.type}</span>}
              {filters.annee && <span className="bg-surface px-2 py-1 rounded">Année: {filters.annee}</span>}
              {filters.numero_boite && <span className="bg-surface px-2 py-1 rounded">N°: {filters.numero_boite}</span>}
              {filters.valeur && <span className="bg-surface px-2 py-1 rounded">Valeur: {filters.valeur}</span>}
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
            <button
              onClick={() => {
                const allBoxes: Array<{ boxNumber: string; records: any[] }> = [];
                results.forEach(result => {
                  allBoxes.push(...getAllBoxes(result));
                });
                handlePrint(allBoxes, `Résultats de recherche (${total} boîtes)`);
              }}
              className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
            >
              <PrinterIcon /> Tout imprimer
            </button>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const boxes = getAllBoxes(result);
                          handlePrint(boxes, `Toutes les boîtes - ${result.nom}`);
                        }}
                        className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors flex items-center gap-1"
                      >
                        <PrinterIcon /> Imprimer tout
                      </button>
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const boxes = getBoxesByType(result, type);
                                    handlePrint(boxes, `${type.nom} - ${result.nom}`);
                                  }}
                                  className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors flex items-center gap-1"
                                >
                                  <PrinterIcon /> Imprimer
                                </button>
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
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const boxes = getBoxesByAnnee(result, type, annee);
                                              handlePrint(boxes, `Année ${annee.annee} - ${type.nom}`);
                                            }}
                                            className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors flex items-center gap-1"
                                          >
                                            <PrinterIcon /> Imprimer
                                          </button>
                                          <span className="text-muted text-sm">{isAnneeExpanded ? '▼' : '▶'}</span>
                                        </div>
                                      </div>

                                      {/* Boîtes */}
                                      {isAnneeExpanded && (
                                        <div className="ml-6 mt-1 space-y-1">
                                          {annee.boites.map((boite) => (
                                            <div
                                              key={boite.numero_boite}
                                              className="flex items-center justify-between p-2 bg-surface/30 hover:bg-surface rounded border border-border/50 transition-colors"
                                            >
                                              <div className="flex items-center gap-3">
                                                <span className="text-lg">📦</span>
                                                <span className="font-mono font-bold text-primary">{boite.numero_boite}</span>
                                                <div className="text-xs text-muted font-mono flex gap-2 flex-wrap">
                                                  {Object.entries(boite.metaValues).map(([key, val]) => (
                                                    <span key={key}>
                                                      <span className="font-semibold">{val.label}:</span> {val.value}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                              <button
                                                onClick={() => {
                                                  const boxes = [{
                                                    boxNumber: boite.numero_boite,
                                                    records: [{
                                                      numero_boite: boite.numero_boite,
                                                      agence_nom: result.nom,
                                                      type_document: type.nom,
                                                      annee: annee.annee,
                                                      metaValues: boite.metaValues,
                                                    }],
                                                  }];
                                                  handlePrint(boxes, `Boîte ${boite.numero_boite}`);
                                                }}
                                                className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors flex items-center gap-1"
                                              >
                                                <PrinterIcon /> Imprimer
                                              </button>
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

          {/* ─── ✅ PAGINATION ────────────────────────────────── */}
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

      {/* ─── MODAL D'IMPRESSION ────────────────────────────────── */}
      <PrintModal
        isOpen={printModal.isOpen}
        onClose={handlePrintClose}
        boxes={printModal.boxes}
        fields={['numero_boite', 'agence_nom', 'type_document', 'annee']}
        title={printModal.title}
        filename={`Recherche_${new Date().toISOString().slice(0, 10)}`}
        total={printModal.boxes.length}
        sourceTotal={printModal.boxes.length}
        onPrint={() => window.print()}
        onReset={handlePrintClose}
      />
    </div>
  );
};

export default RecherchePage;