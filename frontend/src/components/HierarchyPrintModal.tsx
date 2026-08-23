import React from 'react';
import PrintPreview from './PrintPreview';

interface HierarchyPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  boxes: Array<{
    boxNumber: string;
    records: any[];
  }>;
  title: string;
  fields?: string[];
  visibleFields?: string[];
}

const HierarchyPrintModal: React.FC<HierarchyPrintModalProps> = ({
  isOpen,
  onClose,
  boxes,
  title,
  fields = ['numero_boite', 'agence_nom', 'type_document', 'caissiers', 'annee'],
  visibleFields = ['numero_boite', 'agence_nom', 'type_document', 'caissiers'],
}) => {
  if (!isOpen) return null;

  const totalBoxes = boxes.length;
  const totalRecords = boxes.reduce((sum, b) => sum + b.records.length, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* En-tête */}
          <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
            <div>
              <h2 className="text-xl font-bold text-primary">🖨️ {title}</h2>
              <p className="text-sm text-muted font-mono">
                {totalBoxes} boîte{totalBoxes > 1 ? 's' : ''} • {totalRecords} document{totalRecords > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
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

          {/* Contenu */}
          <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
            {boxes.length > 0 ? (
              <PrintPreview
                boxes={boxes}
                fields={fields}
                visibleFields={visibleFields}
                cols={2}
                size="md"
                boxField="numero_boite"
              />
            ) : (
              <div className="text-center py-12 text-muted font-mono">
                <div className="text-4xl mb-3">📭</div>
                Aucune boîte à imprimer
              </div>
            )}
          </div>

          {/* Pied (caché à l'impression) */}
          <div className="sticky bottom-0 bg-white border-t border-border px-6 py-3 flex justify-between items-center rounded-b-lg print:hidden">
            <span className="text-xs text-muted font-mono">
              {totalBoxes} boîte{totalBoxes > 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              className="bg-surface hover:bg-border text-primary px-4 py-2 rounded font-mono text-sm transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HierarchyPrintModal;