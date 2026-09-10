import React from 'react';
import PrintPreview from './PrintPreview';
import SettingsPanel from './SettingsPanel';
import { useSettings } from '../contexts/SettingsContext';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxes: Array<{ boxNumber: string; records: any[] }>;
  fields: string[];
  title: string;
  filename?: string;
  total?: number;
  sourceTotal?: number;
  availableYears?: string[];
  selectedYears?: string[];
  onToggleYear?: (year: string) => void;
  onPrint: () => void;
  onReset?: () => void;
  visibleFields?: string[];
  metaFields?: Array<{ id: number; name: string; label: string; field_type: string }>;
}

const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  boxes,
  fields: propFields,
  title,
  filename = 'Archives',
  total = boxes.length,
  sourceTotal = boxes.length,
  availableYears = [],
  selectedYears = [],
  onToggleYear = () => {},
  onPrint,
  onReset = () => {},
  visibleFields: propVisibleFields,
  metaFields = [],
}) => {
  const { 
    visibleFields: contextVisibleFields, 
    cols, 
    size, 
    setVisibleFields,
    labelsPerPage
  } = useSettings();
  const initializedFieldsRef = React.useRef('');
  
  const fieldsFromMeta = metaFields.map(mf => mf.name);
  
  const fieldsToUse = fieldsFromMeta.length > 0 
    ? fieldsFromMeta 
    : (propFields && propFields.length > 0 ? propFields : []);
  
  const finalFields = fieldsToUse.length > 0 
    ? fieldsToUse 
    : ['numero_boite', 'annee'];
  
  const visibleFields = contextVisibleFields.filter(field => finalFields.includes(field));
  
  React.useEffect(() => {
    const fieldsKey = finalFields.join('|');
    if (!isOpen) {
      initializedFieldsRef.current = '';
      return;
    }
    if (!fieldsKey || initializedFieldsRef.current === fieldsKey) return;

    // Conserver l'ordre choisi pour les champs communs, puis ajouter les
    // champs du type sélectionné. Ainsi le panneau et l'aperçu restent alignés.
    const retained = contextVisibleFields.filter(field => finalFields.includes(field));
    setVisibleFields([...retained, ...finalFields.filter(field => !retained.includes(field))]);
    initializedFieldsRef.current = fieldsKey;
  }, [isOpen, finalFields.join('|'), contextVisibleFields, setVisibleFields]);

  if (!isOpen) return null;

  return (
    <div className="print-modal fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div 
          className="print-modal-dialog bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="no-print sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
            <h2 className="text-xl font-bold text-primary">🖨️ {title}</h2>
            <div className="flex gap-3">
              <button
                onClick={onPrint}
                className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm transition-colors flex items-center gap-2"
              >
                🖨️ Imprimer
              </button>
              <button
                onClick={onClose}
                className="bg-surface hover:bg-border text-primary px-4 py-2 rounded font-mono text-sm transition-colors"
              >
                ✕ Fermer
              </button>
            </div>
          </div>

          <div className="print-modal-content flex flex-1 overflow-hidden">
            <SettingsPanel
              filename={filename}
              total={total}
              sourceTotal={sourceTotal}
              availableYears={availableYears}
              selectedYears={selectedYears}
              onToggleYear={onToggleYear}
              onPrint={onPrint}
              onReset={onReset}
              fields={finalFields}
              metaFields={metaFields}
            />
            
            <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
              {boxes.length > 0 ? (
                <PrintPreview
                  boxes={boxes}
                  fields={finalFields}
                  visibleFields={visibleFields.length > 0 ? visibleFields : finalFields}
                  cols={cols}
                  size={size}
                  boxField="numero_boite"
                  labelsPerPage={labelsPerPage}
                  metaFields={metaFields}
                  selectedYears={selectedYears}
                />
              ) : (
                <div className="text-center py-12 text-muted font-mono">
                  <div className="text-4xl mb-3">📭</div>
                  Aucune boîte à imprimer
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
