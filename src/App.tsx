import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  SearchAndFilterBar 
} from './components/SearchAndFilterBar';
import { 
  DataTable 
} from './components/DataTable';
import { 
  PaginationControls 
} from './components/PaginationControls';
import { 
  ColumnConfigModal 
} from './components/ColumnConfigModal';
import { 
  EditModal 
} from './components/EditModal';
import { 
  ConfirmModal 
} from './components/ConfirmModal';
import { 
  FileDropZone 
} from './components/FileDropZone';
import { 
  ToastProvider, useToast 
} from './components/Toast';
import { 
  ErrorBoundary 
} from './components/ErrorBoundary';
import { 
  EditableItem, ColumnDefinition, parseAndValidateJson, 
  matchesQuery, reconstructJson 
} from './utils/jsonEngine';
import { 
  SAMPLE_JSON_STRING 
} from './utils/sampleData';
import { 
  AlertTriangle, Database, Info, Layers, CheckCircle2 
} from 'lucide-react';

function AppContent() {
  const { showToast } = useToast();

  // Primary dataset state
  const [fileName, setFileName] = useState<string>('articulos_publicados_2026.json');
  const [fileSize, setFileSize] = useState<number>(4180);
  const [originalRoot, setOriginalRoot] = useState<any>(null);
  const [collectionPath, setCollectionPath] = useState<string[]>([]);
  const [rootStructure, setRootStructure] = useState<'array' | 'object'>('object');
  const [indentation, setIndentation] = useState<number>(2);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [titleField, setTitleField] = useState<string>('title');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Selection state (persists across filters, pagination, and column configuration)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Pending file upload that might require confirmation if unsaved changes exist
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Load sample dataset on mount
  useEffect(() => {
    loadJsonData(SAMPLE_JSON_STRING, 'catalogo_cursos_2026.json', SAMPLE_JSON_STRING.length, false);
  }, []);

  const loadJsonData = (rawJson: string, name: string, size: number, notify: boolean = true) => {
    const parseResult = parseAndValidateJson(rawJson);

    if (!parseResult.success) {
      showToast('error', 'Error al cargar JSON', parseResult.error || 'El archivo no es compatible.');
      return false;
    }

    setFileName(name);
    setFileSize(size);
    setOriginalRoot(parseResult.originalRoot);
    setCollectionPath(parseResult.collectionPath);
    setRootStructure(parseResult.rootStructure);
    setIndentation(parseResult.indentation);
    setItems(parseResult.items);
    setColumns(parseResult.columns);
    setTitleField(parseResult.titleField);
    setSelectedIds(new Set());
    setSearchQuery('');
    setSelectedField('all');
    setCurrentPage(1);
    setHasUnsavedChanges(false);

    if (notify) {
      showToast(
        'success',
        'Archivo cargado con éxito',
        `Se detectaron ${parseResult.items.length} objetos editables. Campo de título: "${parseResult.titleField}".`
      );
    }
    return true;
  };

  // Safe file reader with validation and unsaved changes check
  const handleFileSelect = (file: File) => {
    if (hasUnsavedChanges) {
      setPendingFile(file);
      setConfirmDialog({
        isOpen: true,
        title: '¿Reemplazar archivo con cambios no guardados?',
        message: 'Tienes cambios pendientes en el archivo actual que no han sido descargados. Si cargas un nuevo archivo, esos cambios se descartarán permanentemente.',
        confirmLabel: 'Reemplazar y descartar cambios',
        variant: 'warning',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          processFile(file);
        },
      });
      return;
    }

    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        loadJsonData(content, file.name, file.size, true);
      }
    };
    reader.onerror = () => {
      showToast('error', 'Error de lectura', 'No se pudo leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    if (hasUnsavedChanges) {
      setConfirmDialog({
        isOpen: true,
        title: '¿Cargar dataset de ejemplo?',
        message: 'Tienes cambios pendientes en el archivo activo. ¿Deseas descartarlos y recargar los datos de ejemplo?',
        confirmLabel: 'Cargar ejemplo',
        variant: 'warning',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          loadJsonData(SAMPLE_JSON_STRING, 'catalogo_cursos_2026.json', SAMPLE_JSON_STRING.length, true);
        },
      });
      return;
    }
    loadJsonData(SAMPLE_JSON_STRING, 'catalogo_cursos_2026.json', SAMPLE_JSON_STRING.length, true);
  };

  // Filtered items based on search and field filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => matchesQuery(item.data, searchQuery, selectedField));
  }, [items, searchQuery, selectedField]);

  // Paginated slice
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Adjust page if filters reduce result count
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredItems.length, pageSize, currentPage]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const visibleIds = paginatedItems.map((it) => it._internalId);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Single Item Save from EditModal
  const handleSaveItem = (savedItem: EditableItem) => {
    setItems((prev) =>
      prev.map((it) => (it._internalId === savedItem._internalId ? savedItem : it))
    );
    setHasUnsavedChanges(true);
    showToast('success', 'Cambios guardados', 'El objeto se actualizó correctamente en la colección.');
  };

  // Single Item Delete
  const handleRequestDeleteItem = (itemToDelete: EditableItem) => {
    const itemTitle = itemToDelete.data.published?.title
      ? String(itemToDelete.data.published.title)
      : itemToDelete.data.title
      ? String(itemToDelete.data.title)
      : itemToDelete.data[titleField]
      ? String(itemToDelete.data[titleField])
      : `Objeto #${itemToDelete.data.id ?? ''}`;

    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar objeto?',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${itemTitle}"? Esta acción se aplicará sobre la colección activa.`,
      confirmLabel: 'Eliminar objeto',
      variant: 'danger',
      onConfirm: () => {
        setItems((prev) => prev.filter((it) => it._internalId !== itemToDelete._internalId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(itemToDelete._internalId);
          return next;
        });
        setHasUnsavedChanges(true);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setEditingItem(null);
        showToast('info', 'Objeto eliminado', `Se eliminó "${itemTitle}".`);
      },
    });
  };

  // Multiple Items Delete
  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: `¿Eliminar ${count} objetos seleccionados?`,
      message: `Esta acción removerá los ${count} objetos seleccionados de la colección actual.`,
      confirmLabel: `Eliminar ${count} objetos`,
      variant: 'danger',
      onConfirm: () => {
        setItems((prev) => prev.filter((it) => !selectedIds.has(it._internalId)));
        setSelectedIds(new Set());
        setHasUnsavedChanges(true);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('info', 'Objetos eliminados', `Se eliminaron ${count} objetos de la colección.`);
      },
    });
  };

  // Export Selected Items
  const handleExportSelected = () => {
    const selectedList = items.filter((it) => selectedIds.has(it._internalId));
    if (selectedList.length === 0) {
      showToast('warning', 'Sin selección', 'Selecciona al menos un objeto para exportar.');
      return;
    }

    try {
      const reconstructed = reconstructJson(originalRoot, collectionPath, selectedList);
      const jsonString = JSON.stringify(reconstructed, null, indentation);

      // Trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seleccion_${fileName}`;
      link.click();
      URL.revokeObjectURL(url);

      showToast(
        'success',
        'Exportación completada',
        `Se exportaron ${selectedList.length} objetos seleccionados conservando la estructura original.`
      );
    } catch (err: any) {
      showToast('error', 'Error al exportar', err.message || 'No se pudo generar el archivo JSON.');
    }
  };

  // Export Complete Modified Dataset
  const handleDownloadModified = () => {
    try {
      const reconstructed = reconstructJson(originalRoot, collectionPath, items);
      const jsonString = JSON.stringify(reconstructed, null, indentation);

      // Validate jsonString by parsing back
      JSON.parse(jsonString);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/\.json$/i, '') + '_modificado.json';
      link.click();
      URL.revokeObjectURL(url);

      setHasUnsavedChanges(false);
      showToast(
        'success',
        'JSON descargado con éxito',
        `Colección completa de ${items.length} objetos exportada conservando metadatos y tipos originales.`
      );
    } catch (err: any) {
      showToast('error', 'Error al exportar', err.message || 'No se pudo generar el archivo JSON.');
    }
  };

  // Update visible columns from config modal
  const handleApplyColumnConfig = (updatedColumns: ColumnDefinition[]) => {
    setColumns(updatedColumns);
    showToast('info', 'Visualización actualizada', 'Las preferencias de columnas han sido aplicadas.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        fileName={fileName}
        fileSize={fileSize}
        totalItems={items.length}
        hasUnsavedChanges={hasUnsavedChanges}
        onFileSelect={handleFileSelect}
        onLoadSample={handleLoadSample}
        onDownloadModified={handleDownloadModified}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Memory limit notice if dataset is large */}
        {items.length > 2000 && (
          <div className="p-4 bg-amber-950/60 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-100">Dataset de gran volumen detectado ({items.length} objetos)</p>
              <p className="text-amber-300 mt-0.5">
                La aplicación utiliza renderizado paginado en memoria para optimizar el rendimiento. Se recomienda descargar copias periódicas de seguridad.
              </p>
            </div>
          </div>
        )}

        {/* Structure overview badge banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Estructura raíz:</span>
              <strong className="text-white font-mono uppercase bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {rootStructure}
              </strong>
            </div>

            {collectionPath.length > 0 && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Ruta de la colección:</span>
                <strong className="text-indigo-300 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  root.{collectionPath.join('.')}
                </strong>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Campo de enlace/título:</span>
              <strong className="text-emerald-300 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {titleField}
              </strong>
            </div>
          </div>

          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Haz clic en el título de cualquier fila para abrir el editor modal completo.</span>
          </div>
        </div>

        {/* Search, Filter and Bulk Action Controls */}
        <SearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedField={selectedField}
          onFieldChange={setSelectedField}
          columns={columns}
          totalMatches={filteredItems.length}
          totalItems={items.length}
          selectedCount={selectedIds.size}
          onClearSelection={handleClearSelection}
          onDeleteSelected={handleDeleteSelected}
          onExportSelected={handleExportSelected}
          onResetFilters={() => {
            setSearchQuery('');
            setSelectedField('all');
          }}
          onOpenColumnConfig={() => setIsColumnConfigOpen(true)}
        />

        {/* Primary Data Table */}
        <DataTable
          items={paginatedItems}
          columns={columns}
          titleField={titleField}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onOpenEdit={(item) => setEditingItem(item)}
          onDeleteItem={(item) => handleRequestDeleteItem(item)}
          onOpenColumnConfig={() => setIsColumnConfigOpen(true)}
        />

        {/* Pagination bar */}
        <PaginationControls
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {/* Secondary Drag and Drop zone for easy switching */}
        <div className="pt-4">
          <FileDropZone
            onFileDrop={handleFileSelect}
            onLoadSample={handleLoadSample}
            activeFileName={fileName}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <p>JSON Editor & Viewer Pro • Edición segura, sanitización HTML y preservación íntegra de tipos</p>
      </footer>

      {/* Edit Modal */}
      <EditModal
        isOpen={editingItem !== null}
        item={editingItem}
        columns={columns}
        titleField={titleField}
        onSave={handleSaveItem}
        onDelete={(item) => handleRequestDeleteItem(item)}
        onClose={() => setEditingItem(null)}
      />

      {/* Column Config Modal */}
      <ColumnConfigModal
        isOpen={isColumnConfigOpen}
        columns={columns}
        onApply={handleApplyColumnConfig}
        onClose={() => setIsColumnConfigOpen(false)}
      />

      {/* Universal Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}
