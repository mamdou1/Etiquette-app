import React, { useState, useEffect } from 'react';
import AgenceManager from '../components/AgenceManager';
import HierarchyTree from '../components/HierarchyTree';
import PrintModal from '../components/PrintModal';
import { Agence, getAllAgences, getAgenceHierarchy, HierarchyData } from '../services/agenceService';
import { useSettings } from '../contexts/SettingsContext';

const AgencePage: React.FC = () => {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | null>(null);
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    boxes: Array<{ boxNumber: string; records: any[] }>;
    title: string;
  }>({
    isOpen: false,
    boxes: [],
    title: '',
  });

  const { setVisibleFields } = useSettings();

  const loadAgences = async () => {
    try {
      const response = await getAllAgences();
      setAgences(response.data);
      if (response.data.length > 0 && !selectedAgenceId) {
        const firstId = response.data[0]?.id;
        if (firstId) {
          setSelectedAgenceId(firstId);
        }
      }
    } catch (error) {
      console.error('Erreur chargement agences:', error);
    }
  };

  const loadHierarchy = async (agenceId: number) => {
    setLoading(true);
    try {
      const response = await getAgenceHierarchy(agenceId);
      if (response.success) {
        setHierarchy(response.data);
        // Définir les champs visibles par défaut
        const defaultFields = ['numero_boite', 'agence_nom', 'type_document', 'caissiers', 'annee'];
        setVisibleFields(defaultFields);
      }
    } catch (error) {
      console.error('Erreur chargement hiérarchie:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgences();
  }, []);

  useEffect(() => {
    if (selectedAgenceId) {
      loadHierarchy(selectedAgenceId);
    }
  }, [selectedAgenceId]);

  const handlePrintBoxes = (boxes: Array<{ boxNumber: string; records: any[] }>, title: string) => {
    setPrintModal({
      isOpen: true,
      boxes,
      title,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setPrintModal({ isOpen: false, boxes: [], title: '' });
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">🏢 Gestion des Agences</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Gérez les agences et visualisez la hiérarchie des boîtes
        </p>
      </div>

      {/* Sélecteur d'agence */}
      <div className="mb-6 flex items-center gap-4">
        <label className="font-mono text-sm text-muted">Agence :</label>
        <select
          value={selectedAgenceId || ''}
          onChange={(e) => setSelectedAgenceId(Number(e.target.value))}
          className="border border-border px-4 py-2 rounded font-mono text-sm focus:outline-none focus:border-accent"
        >
          {agences.map((agence) => (
            <option key={agence.id} value={agence.id}>
              {agence.nom}
            </option>
          ))}
        </select>
        {loading && (
          <span className="text-muted font-mono text-sm animate-pulse">⏳ Chargement...</span>
        )}
      </div>

      {/* Hiérarchie */}
      {hierarchy && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-border p-6">
          <HierarchyTree data={hierarchy} onPrintBoxes={handlePrintBoxes} />
        </div>
      )}

      {!loading && !hierarchy && (
        <div className="text-center py-12 bg-white rounded-lg border border-border">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-muted">Aucune donnée</h3>
          <p className="text-sm text-muted/60 font-mono">
            Sélectionnez une agence ou importez des données
          </p>
        </div>
      )}

      {/* Gestion des agences (CRUD) */}
      <div className="mt-8">
        <AgenceManager />
      </div>

      {/* Modal d'impression avec PrintModal */}
      <PrintModal
        isOpen={printModal.isOpen}
        onClose={handleReset}
        boxes={printModal.boxes}
        fields={['numero_boite', 'agence_nom', 'type_document', 'caissiers', 'annee']}
        title={printModal.title}
        filename={`Agence_${hierarchy?.agence?.nom || 'inconnue'}`}
        total={printModal.boxes.length}
        sourceTotal={printModal.boxes.length}
        onPrint={handlePrint}
        onReset={handleReset}
      />
    </div>
  );
};

export default AgencePage;