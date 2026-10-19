import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, CheckSquare, Square, X, Check } from 'lucide-react';
import { ColumnDefinition } from '../utils/jsonEngine';

interface ColumnConfigModalProps {
  isOpen: boolean;
  columns: ColumnDefinition[];
  onApply: (updatedColumns: ColumnDefinition[]) => void;
  onClose: () => void;
}

export const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({
  isOpen,
  columns,
  onApply,
  onClose,
}) => {
  // Working draft
  const [draftColumns, setDraftColumns] = useState<ColumnDefinition[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDraftColumns(columns.map(col => ({ ...col })));
    }
  }, [isOpen, columns]);

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    setDraftColumns(prev =>
      prev.map(c => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const handleSelectAll = () => {
    setDraftColumns(prev => prev.map(c => ({ ...c, visible: true })));
  };

  const handleDeselectAll = () => {
    // Keep title column visible as minimum
    setDraftColumns(prev =>
      prev.map(c => ({ ...c, visible: c.isTitle ? true : false }))
    );
  };

  const handleSave = () => {
    onApply(draftColumns);
    onClose();
  };

  const visibleCount = draftColumns.filter(c => c.visible).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="column-config-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 id="column-config-title" className="text-base font-bold text-white">
                Ajuste Visual de Columnas
              </h3>
              <p className="text-xs text-slate-400">
                {visibleCount} de {draftColumns.length} columnas visibles en tabla
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Cerrar configuración"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick batch selectors */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 text-xs">
          <span className="text-slate-400">Acciones rápidas:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline transition-colors"
            >
              Mostrar todas
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-slate-400 hover:text-slate-300 font-medium hover:underline transition-colors"
            >
              Ocultar opcionales
            </button>
          </div>
        </div>

        {/* Column list */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          <div className="text-xs text-slate-400 mb-2">
            Marque las columnas que desea ver en la vista de tabla. (Ocultar columnas solo afecta la vista; la exportación siempre conservará la estructura completa e intacta).
          </div>

          <div className="space-y-1.5">
            {draftColumns.map(col => {
              const isChecked = col.visible;
              return (
                <label
                  key={col.key}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-slate-800/80 border-slate-700 text-white'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleColumn(col.key)}
                      className="w-4 h-4 rounded bg-slate-850 border-slate-600 text-indigo-600 accent-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{col.label}</span>
                        {col.isTitle && (
                          <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Título
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400 truncate block">
                        {col.key}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 uppercase">
                    {col.type}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-700/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Aceptar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
