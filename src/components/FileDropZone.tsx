import React, { useState } from 'react';
import { UploadCloud, FileJson, AlertCircle, Sparkles } from 'lucide-react';

interface FileDropZoneProps {
  onFileDrop: (file: File) => void;
  onLoadSample: () => void;
  activeFileName?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileDrop,
  onLoadSample,
  activeFileName,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
        alert('Por favor selecciona un archivo con formato .json');
        return;
      }
      onFileDrop(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative p-8 rounded-3xl border-2 border-dashed transition-all duration-300 text-center flex flex-col items-center justify-center gap-4 ${
        isDragOver
          ? 'bg-indigo-950/40 border-indigo-400 scale-[1.01]'
          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/70'
      }`}
    >
      <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
        <UploadCloud className="w-8 h-8" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base font-bold text-white tracking-tight">
          Arrastra y suelta tu archivo JSON aquí
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Compatible con colecciones en la raíz (<code>[ ... ]</code>) o dentro de objetos con claves contenedoras (<code>{'{'} "items": [...] {'}'}</code>).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
        <label
          htmlFor="dropzone-file-input"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer shadow-lg shadow-indigo-950/50 transition-colors"
        >
          <FileJson className="w-4 h-4" />
          <span>Examinar archivo local</span>
          <input
            id="dropzone-file-input"
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onFileDrop(file);
                e.target.value = '';
              }
            }}
            className="sr-only"
          />
        </label>

        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Cargar dataset de ejemplo</span>
        </button>
      </div>

      {activeFileName && (
        <p className="text-[11px] text-slate-500 mt-2">
          Archivo cargado actualmente: <span className="text-slate-300 font-mono">{activeFileName}</span>
        </p>
      )}
    </div>
  );
};
