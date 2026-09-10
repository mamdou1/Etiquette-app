import React from 'react';
import { HierarchyData } from '../services/agenceService';

// ✅ Définir le type avec 'boite' inclus
type PrintLevel = 'agence' | 'type' | 'annee' | 'boite';

interface HierarchyTreeProps {
  data: HierarchyData;
  onPrintBoxes: (boxes: any[], title: string, level: PrintLevel) => void;
  onAddBoite: (typeId: number, typeNom: string) => void;
  expandedTypeId: number | null;
  setExpandedTypeId: (id: number | null) => void;
  expandedAnnee: string | null;
  setExpandedAnnee: (annee: string | null) => void;
  getTypePage: (typeId: number) => number;
  setTypePage: (typeId: number, page: number) => void;
  getAnneePage: (key: string) => number;
  setAnneePage: (key: string, page: number) => void;
  itemsPerPage: number;
  getPaginatedBoites: (boites: any[], page: number) => any[];
  metaFields?: Array<{ name: string; label: string; field_type: string }>;
}

// ✅ Icônes SVG inline
const PrinterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  data,
  onPrintBoxes,
  onAddBoite,
  expandedTypeId,
  setExpandedTypeId,
  expandedAnnee,
  setExpandedAnnee,
  getTypePage,
  setTypePage,
  getAnneePage,
  setAnneePage,
  itemsPerPage,
  getPaginatedBoites,
  metaFields = [],
}) => {
  // Les étiquettes utilisent les valeurs réellement enregistrées par boîte.
  const findValueInBoite = (boite: any, fieldName: string): string | null => {
    // 1. Vérifier dans meta_values
    const storedValue = boite.metaValues?.[fieldName];
    if (storedValue?.value !== undefined && storedValue.value !== '') {
      return String(storedValue.value);
    }

    // 2. Vérifier directement dans la boîte
    if (boite[fieldName] !== undefined && boite[fieldName] !== '') {
      return boite[fieldName];
    }

    // 3. Chercher par correspondance approximative
    const fieldNameLower = fieldName.toLowerCase();
    const fieldNameNormalized = fieldNameLower.replace(/[^a-z0-9]/g, '');
    
    for (const key of Object.keys(boite)) {
      const keyLower = key.toLowerCase();
      const keyNormalized = keyLower.replace(/[^a-z0-9]/g, '');
      
      // Vérifier si les noms correspondent approximativement
      if (keyNormalized === fieldNameNormalized || 
          keyLower.includes(fieldNameLower) || 
          fieldNameLower.includes(keyLower)) {
        if (boite[key] !== undefined && boite[key] !== '') {
          return boite[key];
        }
      }
    }

    return null;
  };

  // ✅ Fonction pour construire un record avec les metaFields
  const buildRecord = (boite: any, typeNom: string, annee: string) => {
    const record: any = {
      numero_boite: boite.numero_boite,
      agence_nom: data.agence.nom,
      type_document: typeNom,
      caissiers: boite.caissiers?.join(', ') || '',
      annee: annee,
      metaValues: {},
      __metaFields: [],
    };

    // Conserver tous les champs, y compris ceux d'un type différent du
    // premier type de l'agence.
    Object.entries(boite.metaValues || {}).forEach(([name, field]: [string, any]) => {
      const value = field?.value ?? field;
      record[name] = value;
      record.metaValues[name] = value;
      record.__metaFields.push({
        id: 0,
        name,
        label: field?.label || name,
        field_type: field?.field_type || 'text',
      });
    });

    return record;

    /* Legacy mapping kept below for reference; records now return above.
    const fieldMapping: Record<string, string> = {
      'Date de Production': 'date_production',
      'date_production': 'Date de Production',
      'Type de Document': 'type_document',
      'type_document': 'Type de Document',
      'Nom des caissiers': 'caissiers',
      'caissiers': 'Nom des caissiers',
      "Nom de l' Agence": 'agence_nom',
      'agence_nom': "Nom de l' Agence",
      'Observation': 'observation',
      'observation': 'Observation',
      'Année': 'annee',
      'annee': 'Année',
    };

    // ✅ Pour chaque metaField, chercher la valeur
    metaFields.forEach(mf => {
      let value = null;
      
      // 1. Essayer avec le nom exact du metaField
      value = findValueInBoite(boite, mf.name);
      
      // 2. Si pas trouvé, essayer avec le mapping
      if (!value && fieldMapping[mf.name]) {
        value = findValueInBoite(boite, fieldMapping[mf.name]);
      }
      
      // 3. Si pas trouvé, essayer avec le label
      if (!value && mf.label) {
        value = findValueInBoite(boite, mf.label);
      }
      
      // 4. Si toujours pas trouvé, créer une valeur par défaut
      if (!value) { return;
        // Utiliser les données existantes
        const defaultValues: Record<string, string> = {
          'Date de Production': `01/01/${annee}`,
          'date_production': `01/01/${annee}`,
          'Type de Document': typeNom,
          'type_document': typeNom,
          'Nom des caissiers': boite.caissiers?.join(', ') || 'Non spécifié',
          'caissiers': boite.caissiers?.join(', ') || 'Non spécifié',
          "Nom de l' Agence": data.agence.nom,
          'agence_nom': data.agence.nom,
          'Observation': 'Aucune observation',
          'observation': 'Aucune observation',
          'Année': annee,
          'annee': annee,
        };
        
        // Chercher dans les valeurs par défaut
        if (defaultValues[mf.name]) {
          value = defaultValues[mf.name];
        } else if (mf.label && defaultValues[mf.label]) {
          value = defaultValues[mf.label];
        } else {
          // Valeur par défaut générique
          value = `Valeur de ${mf.label || mf.name}`;
        }
      }
      
      record[mf.name] = value || '';
    });

    // ✅ Ajouter les champs de base si pas déjà présents
    if (!record['numero_boite']) record['numero_boite'] = boite.numero_boite;
    if (!record['annee']) record['annee'] = annee;

    */
    return record;
  };

  // Récupérer toutes les boîtes
  const getAllBoxes = () => {
    const boxes: any[] = [];
    data.types.forEach(type => {
      type.annees.forEach(annee => {
        annee.boites.forEach(boite => {
          boxes.push({
            boxNumber: boite.numero_boite,
            records: [buildRecord(boite, type.nom, annee.annee)],
            year: annee.annee,
          });
        });
      });
    });
    return boxes;
  };

  const getBoxesByType = (type: any) => {
    const boxes: any[] = [];
    type.annees.forEach((annee: any) => {
      annee.boites.forEach((boite: any) => {
        boxes.push({
          boxNumber: boite.numero_boite,
          records: [buildRecord(boite, type.nom, annee.annee)],
          year: annee.annee,
        });
      });
    });
    return boxes;
  };

  const getBoxesByAnnee = (type: any, annee: any) => {
    return annee.boites.map((boite: any) => ({
      boxNumber: boite.numero_boite,
      records: [buildRecord(boite, type.nom, annee.annee)],
      year: annee.annee,
    }));
  };

  return (
    <div className="hierarchy-tree">
      {/* Niveau 1: Agence */}
      <div className="mb-4">
        <div className="flex items-center justify-between bg-primary/5 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <span className="text-lg font-bold text-primary">{data.agence.nom}</span>
              <span className="ml-3 text-sm text-muted font-mono">
                {data.total_boites} boîtes • {data.total_documents} documents
              </span>
            </div>
          </div>
          <button
            onClick={() => onPrintBoxes(getAllBoxes(), `Toutes les étiquettes - ${data.agence.nom}`, 'agence')}
            className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
          >
            <PrinterIcon /> Tout imprimer
          </button>
        </div>
      </div>

      {/* Niveau 2: Types */}
      <div className="ml-6 space-y-3">
        {data.types.map((type) => {
          const isTypeExpanded = expandedTypeId === type.id;
          const typeBoxes = getBoxesByType(type);
          const totalBoites = type.annees.reduce((sum, a) => sum + a.boites.length, 0);

          return (
            <div key={type.id} className="border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 bg-surface hover:bg-surface/80 cursor-pointer transition-colors"
                onClick={() => setExpandedTypeId(isTypeExpanded ? null : type.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{isTypeExpanded ? '📂' : '📁'}</span>
                  <div>
                    <span className="font-medium">{type.nom}</span>
                    <span className="ml-3 text-sm text-muted font-mono">
                      {totalBoites} boîtes • {type.total_documents} documents
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddBoite(type.id, type.nom);
                    }}
                    className="text-green-600 hover:text-green-800 font-mono text-sm px-2 py-1 rounded hover:bg-green-50 transition-colors flex items-center gap-1"
                  >
                    <PlusIcon /> Ajouter
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrintBoxes(typeBoxes, `Tous les types - ${type.nom}`, 'type');
                    }}
                    className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors flex items-center gap-1"
                  >
                    <PrinterIcon /> Imprimer
                  </button>
                  <span className="text-muted">{isTypeExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isTypeExpanded && (
                <div className="p-3 pl-6 space-y-2 bg-white">
                  {type.annees.map((annee) => {
                    const key = `${type.id}-${annee.annee}`;
                    const isAnneeExpanded = expandedAnnee === key;
                    const anneePage = getAnneePage(key);
                    const paginatedBoites = getPaginatedBoites(annee.boites, anneePage);
                    const totalPages = Math.ceil(annee.boites.length / itemsPerPage);
                    const anneeBoxes = getBoxesByAnnee(type, annee);

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
                                onPrintBoxes(anneeBoxes, `Année ${annee.annee} - ${type.nom}`, 'annee');
                              }}
                              className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors flex items-center gap-1"
                            >
                              <PrinterIcon /> Imprimer
                            </button>
                            <span className="text-muted text-sm">{isAnneeExpanded ? '▼' : '▶'}</span>
                          </div>
                        </div>

                        {isAnneeExpanded && (
                          <div className="ml-6 mt-1 space-y-1">
                            {paginatedBoites.map((boite) => (
                              <div
                                key={boite.numero_boite}
                                className="flex items-center justify-between p-2 bg-surface/30 hover:bg-surface rounded border border-border/50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">📦</span>
                                  <span className="font-mono font-bold text-primary">{boite.numero_boite}</span>
                                  <span className="text-xs text-muted font-mono">
                                    {boite.total_documents} docs
                                    {boite.caissiers?.length > 0 && ` • 👤 ${boite.caissiers.join(', ')}`}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    const boxes = [{
                                      boxNumber: boite.numero_boite,
                                      records: [buildRecord(boite, type.nom, annee.annee)],
                                      year: annee.annee,
                                    }];
                                    onPrintBoxes(boxes, `Boîte ${boite.numero_boite}`, 'boite');
                                  }}
                                  className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors flex items-center gap-1"
                                >
                                  <PrinterIcon /> Imprimer
                                </button>
                              </div>
                            ))}

                            {totalPages > 1 && (
                              <div className="flex justify-center items-center gap-2 pt-2">
                                <button
                                  onClick={() => setAnneePage(key, Math.max(1, anneePage - 1))}
                                  disabled={anneePage === 1}
                                  className="px-2 py-1 border border-border rounded text-xs font-mono disabled:opacity-50 hover:bg-surface transition-colors"
                                >
                                  ◀
                                </button>
                                <span className="text-xs font-mono">
                                  Page {anneePage} / {totalPages}
                                </span>
                                <button
                                  onClick={() => setAnneePage(key, Math.min(totalPages, anneePage + 1))}
                                  disabled={anneePage === totalPages}
                                  className="px-2 py-1 border border-border rounded text-xs font-mono disabled:opacity-50 hover:bg-surface transition-colors"
                                >
                                  ▶
                                </button>
                              </div>
                            )}
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
    </div>
  );
};

export default HierarchyTree;
