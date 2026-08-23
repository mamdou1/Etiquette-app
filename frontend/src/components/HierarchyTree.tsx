import React, { useState } from 'react';
import { HierarchyData, HierarchyType, HierarchyAnnee, HierarchyBoite } from '../services/agenceService';

interface HierarchyTreeProps {
  data: HierarchyData;
  onPrintBoxes: (boxes: Array<{ boxNumber: string; records: any[] }>, title: string) => void;
}

const HierarchyTree: React.FC<HierarchyTreeProps> = ({ data, onPrintBoxes }) => {
  const [expandedTypes, setExpandedTypes] = useState<Set<number>>(new Set());
  const [expandedAnnees, setExpandedAnnees] = useState<Set<string>>(new Set());

  const toggleType = (typeId: number) => {
    const newSet = new Set(expandedTypes);
    if (newSet.has(typeId)) {
      newSet.delete(typeId);
    } else {
      newSet.add(typeId);
    }
    setExpandedTypes(newSet);
  };

  const toggleAnnee = (key: string) => {
    const newSet = new Set(expandedAnnees);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedAnnees(newSet);
  };

  // Fonction pour collecter toutes les boîtes d'un type
  const getBoxesFromType = (type: HierarchyType) => {
    const boxes: Array<{ boxNumber: string; records: any[] }> = [];
    type.annees.forEach(annee => {
      annee.boites.forEach(boite => {
        boxes.push({
          boxNumber: boite.numero_boite,
          records: [{ 
            numero_boite: boite.numero_boite,
            agence_nom: data.agence.nom,
            type_document: type.nom,
            caissiers: boite.caissiers.join(', '),
            annee: annee.annee,
            total_documents: boite.total_documents,
          }],
        });
      });
    });
    return boxes;
  };

  // Fonction pour collecter toutes les boîtes d'une année
  const getBoxesFromAnnee = (type: HierarchyType, annee: HierarchyAnnee) => {
    return annee.boites.map(boite => ({
      boxNumber: boite.numero_boite,
      records: [{ 
        numero_boite: boite.numero_boite,
        agence_nom: data.agence.nom,
        type_document: type.nom,
        caissiers: boite.caissiers.join(', '),
        annee: annee.annee,
        total_documents: boite.total_documents,
      }],
    }));
  };

  // Fonction pour collecter toutes les boîtes de l'agence
  const getAllBoxes = () => {
    const boxes: Array<{ boxNumber: string; records: any[] }> = [];
    data.types.forEach(type => {
      type.annees.forEach(annee => {
        annee.boites.forEach(boite => {
          boxes.push({
            boxNumber: boite.numero_boite,
            records: [{ 
              numero_boite: boite.numero_boite,
              agence_nom: data.agence.nom,
              type_document: type.nom,
              caissiers: boite.caissiers.join(', '),
              annee: annee.annee,
              total_documents: boite.total_documents,
            }],
          });
        });
      });
    });
    return boxes;
  };

  return (
    <div className="hierarchy-tree">
      {/* Niveau 1: Agence (tout imprimer) */}
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
            onClick={() => onPrintBoxes(getAllBoxes(), `Toutes les étiquettes - ${data.agence.nom}`)}
            className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
          >
            🖨️ Tout imprimer
          </button>
        </div>
      </div>

      {/* Niveau 2: Types */}
      <div className="ml-6 space-y-3">
        {data.types.map((type) => {
          const isTypeExpanded = expandedTypes.has(type.id);
          const typeBoxes = getBoxesFromType(type);

          return (
            <div key={type.id} className="border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-3 bg-surface hover:bg-surface/80 cursor-pointer transition-colors"
                onClick={() => toggleType(type.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{isTypeExpanded ? '📂' : '📁'}</span>
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
                      onPrintBoxes(typeBoxes, `Tous les types - ${type.nom}`);
                    }}
                    className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors"
                  >
                    🖨️ Imprimer tout
                  </button>
                  <span className="text-muted">{isTypeExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {/* Niveau 3: Années (visible si type expandé) */}
              {isTypeExpanded && (
                <div className="p-3 pl-6 space-y-2 bg-white">
                  {type.annees.map((annee) => {
                    const key = `${type.id}-${annee.annee}`;
                    const isAnneeExpanded = expandedAnnees.has(key);
                    const anneeBoxes = getBoxesFromAnnee(type, annee);

                    return (
                      <div key={annee.annee} className="border-l-2 border-border pl-4">
                        <div
                          className="flex items-center justify-between p-2 hover:bg-surface/50 rounded cursor-pointer transition-colors"
                          onClick={() => toggleAnnee(key)}
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
                                onPrintBoxes(anneeBoxes, `Année ${annee.annee} - ${type.nom}`);
                              }}
                              className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors"
                            >
                              🖨️ Imprimer
                            </button>
                            <span className="text-muted text-sm">{isAnneeExpanded ? '▼' : '▶'}</span>
                          </div>
                        </div>

                        {/* Niveau 4: Boîtes (visible si année expandée) */}
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
                                  <span className="text-xs text-muted font-mono">
                                    {boite.total_documents} docs
                                    {boite.caissiers.length > 0 && ` • 👤 ${boite.caissiers.join(', ')}`}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    const boxes = [{
                                      boxNumber: boite.numero_boite,
                                      records: [{
                                        numero_boite: boite.numero_boite,
                                        agence_nom: data.agence.nom,
                                        type_document: type.nom,
                                        caissiers: boite.caissiers.join(', '),
                                        annee: annee.annee,
                                        total_documents: boite.total_documents,
                                      }],
                                    }];
                                    onPrintBoxes(boxes, `Boîte ${boite.numero_boite}`);
                                  }}
                                  className="text-accent hover:text-red-700 font-mono text-sm px-2 py-1 rounded hover:bg-white/50 transition-colors"
                                >
                                  🖨️ Imprimer
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
    </div>
  );
};

export default HierarchyTree;