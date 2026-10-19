import React from 'react';
import { 
  Settings, Check, Edit3, Trash2, Tag, Eye, EyeOff 
} from 'lucide-react';
import { 
  EditableItem, ColumnDefinition, truncateWords, 
  isHtmlContent, getItemFieldValue 
} from '../utils/jsonEngine';
import { sanitizeHtml } from '../utils/sanitizer';
import { NestedDataViewer } from './NestedDataViewer';

interface DataTableProps {
  items: EditableItem[];
  columns: ColumnDefinition[];
  titleField: string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenEdit: (item: EditableItem) => void;
  onDeleteItem: (item: EditableItem) => void;
  onOpenColumnConfig: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  items,
  columns,
  titleField,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenEdit,
  onDeleteItem,
  onOpenColumnConfig,
}) => {
  const visibleColumns = columns.filter((c) => c.visible);

  const allVisibleSelected = items.length > 0 && items.every((it) => selectedIds.has(it._internalId));
  const someVisibleSelected = items.some((it) => selectedIds.has(it._internalId)) && !allVisibleSelected;

  // Render cell content according to data type and requirements
  const renderCellContent = (item: EditableItem, col: ColumnDefinition) => {
    // Retrieve value using getItemFieldValue which supports published.* and root properties
    const rawVal = getItemFieldValue(item.data, col.key);

    // Null or undefined
    if (rawVal === null || rawVal === undefined) {
      return <span className="text-slate-500 italic text-xs font-mono">null</span>;
    }

    // Is this the Title column? ('title' es el titulo del objeto a editar, no el id)
    if (col.isTitle) {
      const displayTitle = String(rawVal);
      const { text: truncatedTitle, isTruncated } = truncateWords(displayTitle, 20);

      return (
        <button
          type="button"
          onClick={() => onOpenEdit(item)}
          className="text-left font-semibold text-indigo-300 hover:text-indigo-200 hover:underline flex items-start gap-1.5 group cursor-pointer"
          title={isTruncated ? displayTitle : 'Clic para editar este objeto'}
        >
          <span className="leading-snug">{truncatedTitle}</span>
          <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 shrink-0 mt-0.5" />
        </button>
      );
    }

    // Special rendering for 'category' or 'categoria' (shows .name attribute if object)
    if (col.key === 'category' || col.key === 'categoria') {
      const catName = typeof rawVal === 'object' && rawVal !== null ? (rawVal.name ?? JSON.stringify(rawVal)) : String(rawVal);
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/25">
          {catName}
        </span>
      );
    }

    // Special rendering for 'labels' array (shows .name attribute if objects)
    if (col.key === 'labels' && Array.isArray(rawVal)) {
      if (rawVal.length === 0) {
        return <span className="text-slate-500 italic text-xs">Sin etiquetas</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {rawVal.map((lbl, i) => {
            const labelText = typeof lbl === 'object' && lbl !== null ? (lbl.name ?? JSON.stringify(lbl)) : String(lbl);
            return (
              <span
                key={`${labelText}_${i}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/25"
              >
                <Tag className="w-2.5 h-2.5 text-indigo-400" />
                <span>{labelText}</span>
              </span>
            );
          })}
        </div>
      );
    }

    // Special rendering for 'visible' boolean
    if (col.key === 'visible' && typeof rawVal === 'boolean') {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            rawVal
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {rawVal ? (
            <>
              <Eye className="w-3 h-3 text-emerald-400" />
              <span>Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3 text-slate-400" />
              <span>Oculto</span>
            </>
          )}
        </span>
      );
    }

    // Special rendering for 'body' or 'text' (unified paragraph text)
    if (col.key === 'body' || col.key === 'text') {
      const textString = typeof rawVal === 'string' ? rawVal : JSON.stringify(rawVal);
      const { text: truncatedText, isTruncated } = truncateWords(textString, 20);
      return (
        <span
          className="text-xs text-slate-300 leading-relaxed block max-w-md whitespace-pre-line"
          title={isTruncated ? textString : undefined}
        >
          {truncatedText}
        </span>
      );
    }

    // Nested object or array
    if (typeof rawVal === 'object') {
      return <NestedDataViewer data={rawVal} label={col.key} />;
    }

    // Generic Boolean
    if (typeof rawVal === 'boolean') {
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
            rawVal
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          {rawVal ? 'Verdadero' : 'Falso'}
        </span>
      );
    }

    // Number
    if (typeof rawVal === 'number') {
      return <span className="font-mono text-xs text-amber-300">{rawVal.toLocaleString()}</span>;
    }

    // HTML Content (Visual safe rendering + 20 words truncation)
    if (typeof rawVal === 'string' && (col.type === 'html' || isHtmlContent(rawVal))) {
      const { text: truncatedText, isTruncated } = truncateWords(rawVal, 20);
      const safeSanitized = sanitizeHtml(truncatedText);

      return (
        <div
          className="text-xs text-slate-300 max-w-md safe-html-content line-clamp-3"
          title={isTruncated ? 'Contenido HTML truncado a 20 palabras. Haz clic en el título para ver y editar completo.' : undefined}
          dangerouslySetInnerHTML={{ __html: safeSanitized }}
        />
      );
    }

    // Standard string (with 20 words visual truncation rule)
    if (typeof rawVal === 'string') {
      const { text: truncatedText, isTruncated } = truncateWords(rawVal, 20);
      return (
        <span
          className="text-xs text-slate-300 leading-relaxed block max-w-sm"
          title={isTruncated ? rawVal : undefined}
        >
          {truncatedText}
        </span>
      );
    }

    return (
      <span className="text-xs text-slate-400">
        {typeof rawVal === 'object' ? (rawVal?.name ?? JSON.stringify(rawVal)) : String(rawVal)}
      </span>
    );
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-850/90 border-b border-slate-800 text-slate-400 text-xs font-semibold tracking-wider">
              {/* Checkbox column */}
              <th className="py-3.5 px-4 w-12 text-center shrink-0">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-indigo-600 accent-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  aria-label="Seleccionar todos los elementos visibles de la página"
                />
              </th>

              {/* Dynamic visible columns */}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="py-3.5 px-4 font-semibold text-slate-300 whitespace-nowrap select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                      ({col.key})
                    </span>
                    {col.isTitle && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] uppercase font-bold tracking-wider">
                        Título Objeto
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {/* Visual adjustment gear column (fixed at the right) */}
              <th className="py-3.5 px-4 w-28 text-right shrink-0">
                <button
                  type="button"
                  onClick={onOpenColumnConfig}
                  className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                  title="Ajuste visual de columnas"
                  aria-label="Ajustar columnas desde encabezado de tabla"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="py-12 text-center text-slate-400 text-sm"
                >
                  No se encontraron objetos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const isSelected = selectedIds.has(item._internalId);

                return (
                  <tr
                    key={item._internalId}
                    className={`transition-colors hover:bg-slate-850/60 ${
                      isSelected ? 'bg-indigo-950/25 border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    {/* Row checkbox */}
                    <td className="py-3 px-4 text-center shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item._internalId)}
                        className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 accent-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        aria-label={`Seleccionar fila ${idx + 1}`}
                      />
                    </td>

                    {/* Columns */}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="py-3 px-4 align-top break-words text-slate-200"
                      >
                        {renderCellContent(item, col)}
                      </td>
                    ))}

                    {/* Row quick actions */}
                    <td className="py-3 px-4 text-right align-top whitespace-nowrap shrink-0">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar objeto"
                          aria-label="Editar objeto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Eliminar objeto"
                          aria-label="Eliminar objeto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
