import React, { useState, useEffect } from 'react';
import { 
  Search, X, Filter, Trash2, Download, CheckSquare, 
  RotateCcw, SlidersHorizontal 
} from 'lucide-react';
import { ColumnDefinition } from '../utils/jsonEngine';

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedField: string;
  onFieldChange: (field: string) => void;
  columns: ColumnDefinition[];
  totalMatches: number;
  totalItems: number;
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onResetFilters: () => void;
  onOpenColumnConfig: () => void;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedField,
  onFieldChange,
  columns,
  totalMatches,
  totalItems,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onResetFilters,
  onOpenColumnConfig,
}) => {
  // Local input state for smooth debouncing
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        onSearchChange(localQuery);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, onSearchChange]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedField !== 'all';

  return (
    <div className="space-y-3 bg-slate-850/80 p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
      {/* Top row: Search input, field filter, column config button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input with debouncing */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Buscar en texto, HTML sanitizado y datos anidados..."
            className="w-full pl-10 pr-9 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            aria-label="Buscar en la colección"
          />
          {localQuery && (
            <button
              onClick={() => {
                setLocalQuery('');
                onSearchChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter by field select and action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial min-w-[160px]">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedField}
              onChange={(e) => onFieldChange(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors"
              aria-label="Filtrar por campo específico"
            >
              <option value="all">Todos los campos</option>
              {columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} ({c.key})
                </option>
              ))}
            </select>
          </div>

          {/* Reset filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              title="Restablecer búsqueda y filtros"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Restablecer</span>
            </button>
          )}

          {/* Column config button */}
          <button
            type="button"
            onClick={onOpenColumnConfig}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 rounded-xl transition-colors"
            title="Ajustar visualización de columnas"
            aria-label="Configurar columnas en barra de herramientas"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Columnas</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Matches indicator and Bulk actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span>
            {hasActiveFilters ? (
              <>
                Coincidencias: <strong className="text-white font-mono">{totalMatches}</strong> de {totalItems} objetos
              </>
            ) : (
              <>
                Total de objetos: <strong className="text-white font-mono">{totalItems}</strong>
              </>
            )}
          </span>
          {hasActiveFilters && totalMatches === 0 && (
            <span className="text-amber-400">(Sin resultados para este criterio)</span>
          )}
        </div>

        {/* Bulk Action Controls */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 bg-indigo-950/70 border border-indigo-500/40 px-3 py-1.5 rounded-xl animate-in fade-in">
            <span className="text-xs font-semibold text-indigo-200 flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <strong className="text-white font-mono">{selectedCount}</strong> seleccionado{selectedCount === 1 ? '' : 's'}
            </span>

            <button
              type="button"
              onClick={onClearSelection}
              className="text-slate-400 hover:text-white text-xs underline px-1 transition-colors"
            >
              Limpiar
            </button>

            <span className="text-slate-600">|</span>

            {/* Export selected */}
            <button
              type="button"
              onClick={onExportSelected}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-200 bg-indigo-600/60 hover:bg-indigo-600 text-white rounded-lg transition-colors border border-indigo-400/40"
              title="Exportar objetos seleccionados en estructura original"
            >
              <Download className="w-3 h-3" />
              <span>Exportar seleccionados</span>
            </button>

            {/* Delete selected */}
            <button
              type="button"
              onClick={onDeleteSelected}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-200 bg-rose-600/70 hover:bg-rose-600 text-white rounded-lg transition-colors border border-rose-400/40"
              title="Eliminar objetos seleccionados"
            >
              <Trash2 className="w-3 h-3" />
              <span>Eliminar ({selectedCount})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
