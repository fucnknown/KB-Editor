import React, { useRef } from 'react';
import { 
  FileCode, Upload, Download, Sparkles, FileCheck, 
  AlertCircle, HardDrive 
} from 'lucide-react';

interface NavbarProps {
  fileName: string;
  fileSize: number;
  totalItems: number;
  hasUnsavedChanges: boolean;
  onFileSelect: (file: File) => void;
  onLoadSample: () => void;
  onDownloadModified: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  fileName,
  fileSize,
  totalItems,
  hasUnsavedChanges,
  onFileSelect,
  onLoadSample,
  onDownloadModified,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* App Title & Active File Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-lg shadow-indigo-950/50 text-white">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight leading-none">
                  JSON Editor & Viewer Pro
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  ES
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Edición estructural segura con sanitización HTML
              </p>
            </div>
          </div>

          {/* Active File Badge (visible on small screens too) */}
          <div className="flex md:hidden items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">
            <span className="truncate max-w-[120px]">{fileName}</span>
          </div>
        </div>

        {/* Center: File metadata badges */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
            <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-white max-w-[200px] truncate" title={fileName}>
              {fileName}
            </span>
            <span className="text-slate-500">({formatFileSize(fileSize)})</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-mono">
            <strong className="text-indigo-300">{totalItems}</strong> objetos
          </div>

          {hasUnsavedChanges ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Cambios sin descargar</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span>Sincronizado</span>
            </div>
          )}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleInputChange}
            className="hidden"
            id="json-file-input"
          />

          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-700/70 cursor-pointer"
            title="Cargar catálogo de ejemplo en español"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ejemplo</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-200 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-xl transition-colors cursor-pointer"
            title="Seleccionar archivo JSON local"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cargar JSON</span>
          </button>

          <button
            type="button"
            onClick={onDownloadModified}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer border border-emerald-500/30"
            title="Descargar JSON modificado con todas las ediciones confirmadas"
          >
            <Download className="w-4 h-4" />
            <span>Descargar JSON modificado</span>
          </button>
        </div>
      </div>
    </header>
  );
};
