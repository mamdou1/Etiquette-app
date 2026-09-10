import React, { useState, useEffect, useMemo, useRef } from 'react';
import AgenceManager from '../components/AgenceManager';
import HierarchyTree from '../components/HierarchyTree';
import PrintModal from '../components/PrintModal';
import AddBoiteModal from '../components/AddBoiteModal';
import { Agence, getAllAgences, getAgenceHierarchy, getBoitesByAgence, HierarchyData } from '../services/agenceService';
import { getMetaFieldsByType, MetaField } from '../services/metaFieldService';
import { useSettings } from '../contexts/SettingsContext';

const Toast: React.FC<{ message: string; type?: 'success' | 'error' }> = ({ message, type = 'success' }) => {
  if (!message) return null;
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-600',
  };
  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg border shadow-lg z-50 max-w-md ${colors[type]}`}>
      {type === 'success' ? '✅' : '❌'} {message}
    </div>
  );
};

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const AgencePage: React.FC = () => {
  const { setVisibleFields, visibleFields } = useSettings();

  const [agences, setAgences] = useState<Agence[]>([]);
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | null>(null);
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [expandedTypeId, setExpandedTypeId] = useState<number | null>(null);
  const [expandedAnnee, setExpandedAnnee] = useState<string | null>(null);
  const [typePages, setTypePages] = useState<Record<number, number>>({});
  const [anneePages, setAnneePages] = useState<Record<string, number>>({});
  const itemsPerPage = 5;

  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    boxes: Array<{ boxNumber: string; records: any[]; year?: string }>;
    title: string;
    level: 'agence' | 'type' | 'annee' | 'boite';
    visibleFields: string[];
    fields: string[];
    metaFields: Array<{ id: number; name: string; label: string; field_type: string }>;
  }>({
    isOpen: false,
    boxes: [],
    title: '',
    level: 'agence',
    visibleFields: [],
    fields: [],
    metaFields: [],
  });

  const [addModal, setAddModal] = useState<{
    isOpen: boolean;
    typeId: number | null;
    typeNom: string;
  }>({
    isOpen: false,
    typeId: null,
    typeNom: '',
  });

  const [metaFields, setMetaFields] = useState<MetaField[]>([]);
  const [loadingMetaFields, setLoadingMetaFields] = useState(false);
  const [currentTypeId, setCurrentTypeId] = useState<number | null>(null);
  const [selectedPrintYears, setSelectedPrintYears] = useState<string[]>([]);

  const loadAgences = async () => {
    try {
      const response = await getAllAgences();
      setAgences(response.data);
      if (response.data.length > 0 && !selectedAgenceId) {
        const firstId = response.data[0]?.id;
        if (firstId) setSelectedAgenceId(firstId);
      }
    } catch (error) {
      setToast({ message: 'Impossible de charger les agences', type: 'error' });
    }
  };

  const loadHierarchy = async (agenceId: number) => {
    setLoading(true);
    try {
      const response = await getAgenceHierarchy(agenceId);
      if (response.success) {
        setHierarchy(response.data);
        
        // ✅ Récupérer les MetaFields du premier type
        if (response.data.types && response.data.types.length > 0) {
          const firstTypeId = response.data.types[0].id;
          setCurrentTypeId(firstTypeId);
          try {
            const metaFieldsResponse = await getMetaFieldsByType(firstTypeId);
            if (metaFieldsResponse.success) {
              setMetaFields(metaFieldsResponse.data);
              // ✅ Utiliser les noms des metaFields comme champs visibles
              const metaFieldNames = metaFieldsResponse.data.map((mf: { name: string }) => mf.name);
              setVisibleFields(metaFieldNames);
            }
          } catch (err) {
            console.warn('Erreur chargement MetaFields:', err);
          }
        }
      }
    } catch (error) {
      setToast({ message: 'Impossible de charger la hiérarchie', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadMetaFields = async (typeId: number) => {
    setLoadingMetaFields(true);
    try {
      const response = await getMetaFieldsByType(typeId);
      setMetaFields(response.data || []);
    } catch (error) {
      setToast({ message: 'Impossible de charger les champs', type: 'error' });
    } finally {
      setLoadingMetaFields(false);
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

  const filteredHierarchy = useMemo(() => {
    if (!hierarchy || !searchQuery) return hierarchy;
    
    const filteredTypes = hierarchy.types.filter(type => {
      const typeMatch = type.nom.toLowerCase().includes(searchQuery.toLowerCase());
      const anneeMatch = type.annees.some(a => a.annee.includes(searchQuery));
      const boiteMatch = type.annees.some(a => 
        a.boites.some(b => b.numero_boite.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      return typeMatch || anneeMatch || boiteMatch;
    });
    
    return {
      ...hierarchy,
      types: filteredTypes
    };
  }, [hierarchy, searchQuery]);

  const getTypePage = (typeId: number) => typePages[typeId] || 1;
  const getAnneePage = (key: string) => anneePages[key] || 1;

  const setTypePage = (typeId: number, page: number) => {
    setTypePages(prev => ({ ...prev, [typeId]: page }));
  };

  const setAnneePage = (key: string, page: number) => {
    setAnneePages(prev => ({ ...prev, [key]: page }));
  };

  const getPaginatedBoites = (boites: any[], page: number) => {
    const start = (page - 1) * itemsPerPage;
    return boites.slice(start, start + itemsPerPage);
  };

  const handlePrintBoxes = async (boxes: Array<{ boxNumber: string; records: any[]; year?: string }>, title: string, level: 'agence' | 'type' | 'annee' | 'boite') => {
    if (!selectedAgenceId) return;

    try {
      // La hiérarchie ne sert qu'à naviguer. Pour l'impression, relire les
      // colonnes Excel réellement enregistrées dans meta_field_values.
      const response = await getBoitesByAgence(selectedAgenceId);
      const selectedKeys = new Set(boxes.map(box => `${box.boxNumber}|${box.year || ''}`));
      const recordsByBox = new Map<string, any>();

      (response.data || []).forEach((row: any) => {
        const key = `${row.numero_boite}|${row.annee || ''}`;
        if (!selectedKeys.has(key)) return;

        if (!recordsByBox.has(key)) {
          recordsByBox.set(key, {
            numero_boite: row.numero_boite,
            agence_nom: row.agence_nom || hierarchy?.agence.nom || '',
            type_document: row.type_nom || '',
            annee: row.annee || '',
            metaValues: {},
            __metaFields: [],
          });
        }

        const record = recordsByBox.get(key);
        record[row.name] = row.value ?? '';
        record.metaValues[row.name] = row.value ?? '';
        record.__metaFields.push({
          id: row.meta_field_id || row.id || 0,
          name: row.name,
          label: row.label || row.name,
          field_type: row.field_type || 'text',
        });
      });

      const storedBoxes = Array.from(recordsByBox.values()).map((record: any) => ({
        boxNumber: record.numero_boite,
        records: [record],
        year: record.annee,
      }));

      if (storedBoxes.length === 0) {
        setToast({ message: 'Aucune valeur enregistrée n’a été trouvée pour cette sélection', type: 'error' });
        return;
      }

      boxes = storedBoxes;
    } catch (error) {
      setToast({ message: 'Impossible de charger les données enregistrées pour l’impression', type: 'error' });
      return;
    }

    // Chaque sélection peut contenir un type différent. Les champs doivent
    // donc être tirés des boîtes sélectionnées, et non du premier type chargé.
    const storedFields = [...new Set(boxes.flatMap(box =>
      box.records.flatMap(record => Object.keys(record).filter(key =>
        !['metaValues', '__metaFields', 'numero_boite', 'agence_nom', 'type_document', 'caissiers', 'annee'].includes(key)
      ))
    ))];
    const fieldsToUse = ['numero_boite', ...storedFields];
    const years = [...new Set(boxes.map(box => box.year).filter(Boolean))] as string[];
    setSelectedPrintYears(years);
    
    setPrintModal({
      isOpen: true,
      boxes,
      title,
      level,
      visibleFields: visibleFields.filter(field => fieldsToUse.includes(field)),
      fields: fieldsToUse,
      metaFields: fieldsToUse.map(name =>
        boxes.flatMap(box => box.records.flatMap(record => record.__metaFields || []))
          .find(field => field.name === name) || { id: 0, name, label: name, field_type: 'text' }
      ),
    });
  };

  const handleOpenAddBoite = async (typeId: number, typeNom: string) => {
    await loadMetaFields(typeId);
    setCurrentTypeId(typeId);
    setAddModal({
      isOpen: true,
      typeId,
      typeNom,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setPrintModal({ isOpen: false, boxes: [], title: '', level: 'agence', visibleFields: [], fields: [], metaFields: [] });
    setSelectedPrintYears([]);
  };

  const togglePrintYear = (year: string) => {
    setSelectedPrintYears(previous =>
      previous.includes(year) ? previous.filter(value => value !== year) : [...previous, year]
    );
  };

  const handleAddBoiteSuccess = () => {
    if (selectedAgenceId) {
      loadHierarchy(selectedAgenceId);
    }
    setToast({ message: 'Boîte ajoutée avec succès', type: 'success' });
  };

  return (
    <div className="w-full">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">🏢 Gestion des Agences</h1>
        <p className="text-sm text-muted font-mono mt-1">
          Gérez les agences et visualisez la hiérarchie des boîtes
        </p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center gap-4">
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

        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un type, une année, une boîte..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {filteredHierarchy && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-border p-6">
          <HierarchyTree
            data={filteredHierarchy}
            onPrintBoxes={handlePrintBoxes}
            onAddBoite={handleOpenAddBoite}
            expandedTypeId={expandedTypeId}
            setExpandedTypeId={setExpandedTypeId}
            expandedAnnee={expandedAnnee}
            setExpandedAnnee={setExpandedAnnee}
            getTypePage={getTypePage}
            setTypePage={setTypePage}
            getAnneePage={getAnneePage}
            setAnneePage={setAnneePage}
            itemsPerPage={itemsPerPage}
            getPaginatedBoites={getPaginatedBoites}
            metaFields={metaFields}
          />
        </div>
      )}

      {!loading && !filteredHierarchy && (
        <div className="text-center py-12 bg-white rounded-lg border border-border">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-muted">Aucune donnée</h3>
          <p className="text-sm text-muted/60 font-mono">
            Sélectionnez une agence ou importez des données
          </p>
        </div>
      )}

      <div className="mt-8">
        <AgenceManager />
      </div>

      <PrintModal
        isOpen={printModal.isOpen}
        onClose={handleReset}
        boxes={printModal.boxes}
        fields={printModal.fields}
        title={printModal.title}
        filename={`Agence_${hierarchy?.agence?.nom || 'inconnue'}`}
        total={printModal.boxes.length}
        sourceTotal={printModal.boxes.length}
        availableYears={[...new Set(printModal.boxes.map(box => box.year).filter(Boolean))] as string[]}
        selectedYears={selectedPrintYears}
        onToggleYear={togglePrintYear}
        onPrint={handlePrint}
        onReset={handleReset}
        visibleFields={printModal.visibleFields}
        metaFields={printModal.metaFields}
      />

      <AddBoiteModal
        isOpen={addModal.isOpen}
        onClose={() => setAddModal({ isOpen: false, typeId: null, typeNom: '' })}
        agenceId={selectedAgenceId}
        typeId={addModal.typeId}
        typeNom={addModal.typeNom}
        metaFields={metaFields}
        onSuccess={handleAddBoiteSuccess}
        loading={loadingMetaFields}
      />
    </div>
  );
};

export default AgencePage;
