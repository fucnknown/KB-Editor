import React, { useState, useEffect } from 'react';
import { 
  X, Save, Trash2, Code2, Eye, AlertCircle, Plus, 
  Check, FileEdit, Tag, EyeOff, BookOpen, Layers
} from 'lucide-react';
import { 
  EditableItem, ColumnDefinition, isHtmlContent, 
  unifyParagraphsFromVariations, syncUnifiedTextToVariations, 
  getItemFieldValue 
} from '../utils/jsonEngine';
import { sanitizeHtml } from '../utils/sanitizer';

interface EditModalProps {
  isOpen: boolean;
  item: EditableItem | null;
  columns: ColumnDefinition[];
  titleField: string;
  onSave: (savedItem: EditableItem) => void;
  onDelete: (itemToDelete: EditableItem) => void;
  onClose: () => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  item,
  columns,
  titleField,
  onSave,
  onDelete,
  onClose,
}) => {
  // Working draft
  const [draftData, setDraftData] = useState<Record<string, any>>({});
  // Formatted string representations for nested objects/arrays for editing
  const [jsonTextMap, setJsonTextMap] = useState<Record<string, string>>({});
  // Validation errors for JSON fields
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});
  // HTML fields active view mode ('code' | 'preview')
  const [htmlViewMode, setHtmlViewMode] = useState<Record<string, 'code' | 'preview'>>({});

  // Unified paragraph text from variations
  const [unifiedParagraphText, setUnifiedParagraphText] = useState<string>('');
  const [variationsViewMode, setVariationsViewMode] = useState<'unified' | 'json'>('unified');

  // Labels input helper
  const [labelInput, setLabelInput] = useState<string>('');

  // New field addition state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'string' | 'number' | 'boolean' | 'object' | 'array'>('string');
  const [showAddField, setShowAddField] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      const cloned = JSON.parse(JSON.stringify(item.data));
      setDraftData(cloned);

      const texts: Record<string, string> = {};
      const views: Record<string, 'code' | 'preview'> = {};

      Object.entries(cloned).forEach(([k, v]) => {
        if (typeof v === 'object' && v !== null && k !== 'published') {
          texts[k] = JSON.stringify(v, null, 2);
        }
        if (typeof v === 'string' && isHtmlContent(v)) {
          views[k] = 'preview';
        }
      });

      // If published exists, extract unified paragraph text from variations
      if (cloned.published && typeof cloned.published === 'object') {
        const unified = unifyParagraphsFromVariations(cloned.published.variations);
        setUnifiedParagraphText(unified);
        texts['published.variations'] = JSON.stringify(cloned.published.variations, null, 2);
      } else if (cloned.variations) {
        const unified = unifyParagraphsFromVariations(cloned.variations);
        setUnifiedParagraphText(unified);
        texts['variations'] = JSON.stringify(cloned.variations, null, 2);
      } else {
        setUnifiedParagraphText('');
      }

      setJsonTextMap(texts);
      setHtmlViewMode(views);
      setJsonErrors({});
      setShowAddField(false);
      setNewKeyName('');
      setLabelInput('');
      setVariationsViewMode('unified');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const hasPublished = draftData.published && typeof draftData.published === 'object';

  // Handle standard field change
  const handleFieldChange = (key: string, val: any) => {
    setDraftData(prev => ({ ...prev, [key]: val }));
  };

  // Handle published field changes
  const handlePublishedFieldChange = (key: string, val: any) => {
    setDraftData(prev => ({
      ...prev,
      published: {
        ...(prev.published || {}),
        [key]: val,
      },
    }));
  };

  // Add label to published.labels
  const handleAddLabel = () => {
    const trimmed = labelInput.trim();
    if (!trimmed) return;
    const currentLabels: any[] = Array.isArray(draftData.published?.labels)
      ? [...draftData.published.labels]
      : [];

    const isObjectFormat = currentLabels.length > 0 && typeof currentLabels[0] === 'object';
    const exists = currentLabels.some(l => (typeof l === 'object' ? l.name === trimmed : l === trimmed));

    if (!exists) {
      if (isObjectFormat) {
        currentLabels.push({ name: trimmed });
      } else {
        currentLabels.push(trimmed);
      }
      handlePublishedFieldChange('labels', currentLabels);
    }
    setLabelInput('');
  };

  // Remove label from published.labels by index
  const handleRemoveLabel = (indexToRemove: number) => {
    const currentLabels: any[] = Array.isArray(draftData.published?.labels)
      ? [...draftData.published.labels]
      : [];
    currentLabels.splice(indexToRemove, 1);
    handlePublishedFieldChange('labels', currentLabels);
  };

  // Handle JSON field changes with real-time validation
  const handleJsonFieldChange = (key: string, rawText: string) => {
    setJsonTextMap(prev => ({ ...prev, [key]: rawText }));

    try {
      const parsed = JSON.parse(rawText);
      setJsonErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      if (key === 'published.variations') {
        handlePublishedFieldChange('variations', parsed);
        setUnifiedParagraphText(unifyParagraphsFromVariations(parsed));
      } else {
        setDraftData(prev => ({ ...prev, [key]: parsed }));
      }
    } catch (err: any) {
      setJsonErrors(prev => ({
        ...prev,
        [key]: `Error sintáctico: ${err.message}`,
      }));
    }
  };

  const handleAddNewField = () => {
    const trimmed = newKeyName.trim();
    if (!trimmed) return;
    if (draftData[trimmed] !== undefined) {
      alert(`El campo "${trimmed}" ya existe en este objeto.`);
      return;
    }

    let defaultVal: any = '';
    if (newKeyType === 'number') defaultVal = 0;
    if (newKeyType === 'boolean') defaultVal = false;
    if (newKeyType === 'array') defaultVal = [];
    if (newKeyType === 'object') defaultVal = {};

    setDraftData(prev => ({ ...prev, [trimmed]: defaultVal }));
    if (newKeyType === 'array' || newKeyType === 'object') {
      setJsonTextMap(prev => ({ ...prev, [trimmed]: JSON.stringify(defaultVal, null, 2) }));
    }

    setNewKeyName('');
    setShowAddField(false);
  };

  const handleRemoveField = (key: string) => {
    if (key === 'published' || key === titleField || key === 'title') {
      alert('No es recomendable eliminar el objeto principal o campo de título.');
      return;
    }
    const next = { ...draftData };
    delete next[key];
    setDraftData(next);
  };

  const handleSave = () => {
    const errorKeys = Object.keys(jsonErrors);
    if (errorKeys.length > 0) {
      alert(`Por favor corrige los errores sintácticos en los campos JSON: ${errorKeys.join(', ')}`);
      return;
    }

    // Sync unified paragraph text into published.variations
    let finalData = { ...draftData };
    if (hasPublished) {
      const updatedVariations = syncUnifiedTextToVariations(
        finalData.published.variations,
        unifiedParagraphText
      );
      finalData.published = {
        ...finalData.published,
        variations: updatedVariations,
      };
    } else if (finalData.variations) {
      finalData.variations = syncUnifiedTextToVariations(
        finalData.variations,
        unifiedParagraphText
      );
    }

    onSave({
      _internalId: item._internalId,
      data: finalData,
    });
    onClose();
  };

  // 'title' es el titulo del objeto a editar, no el id
  const objectTitle = draftData.published?.title
    ? String(draftData.published.title)
    : draftData.title
    ? String(draftData.title)
    : draftData[titleField] !== undefined
    ? String(draftData[titleField])
    : `Objeto #${draftData.id ?? item._internalId.slice(-5)}`;

  // Root fields to display outside 'published'
  const rootFields = Object.keys(draftData).filter(k => k !== 'published' && !k.startsWith('_internal'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
              <FileEdit className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-indigo-400">
                  Edición de Objeto
                </span>
                {draftData.id !== undefined && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    ID: {draftData.id}
                  </span>
                )}
              </div>
              <h2 id="edit-modal-title" className="text-base font-bold text-white truncate max-w-xl">
                {objectTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"
            aria-label="Cerrar modal de edición"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <p className="text-xs text-slate-400">
              Modifica los campos anidados y variaciones sobre esta copia temporal. Los cambios se aplicarán al presionar <strong className="text-slate-200">"Guardar cambios"</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowAddField(!showAddField)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Campo</span>
            </button>
          </div>

          {/* Add Field Panel */}
          {showAddField && (
            <div className="p-4 bg-slate-850 border border-indigo-500/30 rounded-xl space-y-3 animate-in fade-in">
              <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Nuevo campo para este objeto:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nombre de la clave (ej. autor)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="string">Texto (String)</option>
                  <option value="number">Número (Number)</option>
                  <option value="boolean">Booleano (Boolean)</option>
                  <option value="array">Lista (Array)</option>
                  <option value="object">Objeto (Object)</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewField}
                    className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Insertar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddField(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: PUBLISHED OBJECT (If item has published) */}
          {hasPublished && (
            <div className="p-5 rounded-2xl bg-slate-850/90 border border-indigo-500/30 space-y-5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Objeto Anidado: <span className="font-mono text-indigo-300">"published"</span>
                  </h3>
                </div>
                <span className="text-[11px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/25">
                  Campos CMS Activos
                </span>
              </div>

              {/* 1. published.title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label htmlFor="pub-title" className="text-xs font-bold text-white font-mono">
                      published.title
                    </label>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Título Principal del Objeto
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">string</span>
                </div>
                <input
                  id="pub-title"
                  type="text"
                  value={draftData.published.title ?? ''}
                  onChange={(e) => handlePublishedFieldChange('title', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Introduce el título del objeto..."
                />
              </div>

              {/* 2. published.category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="pub-category" className="text-xs font-bold text-white font-mono">
                    published.category
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">string / name</span>
                </div>
                <input
                  id="pub-category"
                  type="text"
                  value={
                    typeof draftData.published?.category === 'object' && draftData.published?.category !== null
                      ? (draftData.published.category.name ?? '')
                      : (draftData.published?.category ?? '')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (typeof draftData.published?.category === 'object' && draftData.published?.category !== null) {
                      handlePublishedFieldChange('category', { ...draftData.published.category, name: val });
                    } else {
                      handlePublishedFieldChange('category', { name: val });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Categoría del objeto (ej. SECTOR)..."
                />
              </div>

              {/* 3. published.visible */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-700/80">
                <div>
                  <span className="text-xs font-bold text-white font-mono">published.visible</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Determina si este objeto es visible públicamente
                  </p>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(draftData.published.visible)}
                    onChange={(e) => handlePublishedFieldChange('visible', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 accent-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className={`text-xs font-semibold ${draftData.published.visible ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {draftData.published.visible ? 'Visible (true)' : 'Oculto (false)'}
                  </span>
                </label>
              </div>

              {/* 4. published.labels */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono">published.labels</span>
                  <span className="text-[11px] font-mono text-slate-400">array</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-900 rounded-xl border border-slate-700 min-h-[42px] items-center">
                  {Array.isArray(draftData.published.labels) && draftData.published.labels.map((lbl: any, idx: number) => {
                    const labelText = typeof lbl === 'object' && lbl !== null ? (lbl.name ?? JSON.stringify(lbl)) : String(lbl);
                    return (
                      <span
                        key={`${labelText}_${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-200 border border-indigo-500/30"
                      >
                        <Tag className="w-3 h-3 text-indigo-400" />
                        <span>{labelText}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(idx)}
                          className="text-indigo-400 hover:text-white transition-colors"
                          title="Eliminar etiqueta"
                          aria-label={`Eliminar etiqueta ${labelText}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="text"
                      placeholder="Nueva etiqueta..."
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLabel();
                        }
                      }}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-32"
                    />
                    <button
                      type="button"
                      onClick={handleAddLabel}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. published.variations: Unified Paragraphs Editor */}
              <div className="space-y-2.5 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        published.variations / body / text
                      </span>
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        Párrafos Unificados
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Los párrafos y bloques de las variaciones se unen con saltos de línea para representar el cambio de párrafo.
                    </p>
                  </div>

                  {/* Switcher: Unified vs Raw JSON */}
                  <div className="flex rounded-lg bg-slate-900 border border-slate-700 p-0.5 text-xs shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setVariationsViewMode('unified')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                        variationsViewMode === 'unified'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Párrafos Unificados</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVariationsViewMode('json')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                        variationsViewMode === 'json'
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>JSON Estructurado</span>
                    </button>
                  </div>
                </div>

                {variationsViewMode === 'unified' ? (
                  <div className="space-y-1.5">
                    <textarea
                      rows={7}
                      value={unifiedParagraphText}
                      onChange={(e) => setUnifiedParagraphText(e.target.value)}
                      className="w-full font-mono text-xs p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                      placeholder="Escribe o edita los párrafos aquí. Separa con dos saltos de línea (\n\n) para representar el cambio de párrafo..."
                    />
                    <p className="text-[11px] text-slate-500">
                      Consejo: Cada bloque de texto separado por un salto de línea doble será asignado como un objeto párrafo en las variaciones al guardar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <textarea
                      rows={7}
                      value={jsonTextMap['published.variations'] ?? JSON.stringify(draftData.published.variations, null, 2)}
                      onChange={(e) => handleJsonFieldChange('published.variations', e.target.value)}
                      className={`w-full font-mono text-xs p-3.5 bg-slate-950 rounded-xl text-emerald-300 focus:outline-none border ${
                        jsonErrors['published.variations']
                          ? 'border-rose-500'
                          : 'border-slate-700 focus:border-indigo-500'
                      }`}
                    />
                    {jsonErrors['published.variations'] && (
                      <p className="text-xs text-rose-400 font-mono">{jsonErrors['published.variations']}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: OTHER ROOT FIELDS (e.g. id, categoria, etc.) */}
          {rootFields.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Campos del Objeto Raíz
              </h4>

              <div className="space-y-4">
                {rootFields.map((key) => {
                  const value = draftData[key];
                  const isHtml = typeof value === 'string' && isHtmlContent(value);
                  const isObjOrArray = typeof value === 'object' && value !== null;
                  const isBool = typeof value === 'boolean';
                  const isNum = typeof value === 'number';
                  const isNull = value === null;
                  const isTitle = key === titleField || key === 'title';

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`field-${key}`} className="text-sm font-bold text-white font-mono">
                            {key}
                          </label>
                          {isTitle && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Título Principal
                            </span>
                          )}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {isHtml ? 'html' : Array.isArray(value) ? 'array' : typeof value}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isHtml && (
                            <div className="flex rounded-lg bg-slate-900 border border-slate-700 p-0.5 text-xs">
                              <button
                                type="button"
                                onClick={() => setHtmlViewMode(prev => ({ ...prev, [key]: 'code' }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                                  htmlViewMode[key] === 'code'
                                    ? 'bg-indigo-600 text-white font-medium'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                <Code2 className="w-3.5 h-3.5" />
                                <span>Código Fuente</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setHtmlViewMode(prev => ({ ...prev, [key]: 'preview' }))}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                                  htmlViewMode[key] === 'preview'
                                    ? 'bg-indigo-600 text-white font-medium'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Vista Previa Segura</span>
                              </button>
                            </div>
                          )}

                          {!isTitle && (
                            <button
                              type="button"
                              onClick={() => handleRemoveField(key)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                              title="Eliminar campo"
                              aria-label={`Eliminar campo ${key}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inputs */}
                      {isHtml ? (
                        htmlViewMode[key] === 'code' ? (
                          <textarea
                            id={`field-${key}`}
                            rows={4}
                            value={value}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                            className="w-full font-mono text-xs p-3 bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200">
                            <div
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
                              className="prose prose-invert prose-sm max-w-none"
                            />
                          </div>
                        )
                      ) : isObjOrArray ? (
                        <div className="space-y-1.5">
                          <textarea
                            id={`field-${key}`}
                            rows={Array.isArray(value) && value.length > 3 ? 5 : 4}
                            value={jsonTextMap[key] ?? JSON.stringify(value, null, 2)}
                            onChange={(e) => handleJsonFieldChange(key, e.target.value)}
                            className="w-full font-mono text-xs p-3 bg-slate-950 rounded-xl text-emerald-300 focus:outline-none border border-slate-700 focus:border-indigo-500"
                          />
                        </div>
                      ) : isBool ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            id={`field-${key}`}
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleFieldChange(key, e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className={`text-sm font-semibold ${value ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {value ? 'Verdadero (True)' : 'Falso (False)'}
                          </span>
                        </label>
                      ) : isNum ? (
                        <input
                          id={`field-${key}`}
                          type="number"
                          step="any"
                          value={value}
                          onChange={(e) => {
                            const parsed = e.target.value === '' ? '' : Number(e.target.value);
                            handleFieldChange(key, parsed);
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                        />
                      ) : isNull ? (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-500 italic">null</span>
                          <button
                            type="button"
                            onClick={() => handleFieldChange(key, '')}
                            className="text-xs text-indigo-400 hover:underline"
                          >
                            Asignar valor
                          </button>
                        </div>
                      ) : typeof value === 'string' && value.length > 60 ? (
                        <textarea
                          id={`field-${key}`}
                          rows={3}
                          value={value}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      ) : (
                        <input
                          id={`field-${key}`}
                          type="text"
                          value={value ?? ''}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-850/80">
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar objeto</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950/50 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar cambios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
