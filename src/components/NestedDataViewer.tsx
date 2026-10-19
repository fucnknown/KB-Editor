import React, { useState } from 'react';
import { Eye, Copy, Check, X } from 'lucide-react';

interface NestedDataViewerProps {
  data: any;
  label: string;
}

export const NestedDataViewer: React.FC<NestedDataViewerProps> = ({ data, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isArr = Array.isArray(data);
  const isObj = data !== null && typeof data === 'object' && !isArr;

  const countText = isArr
    ? `[${data.length} elemento${data.length === 1 ? '' : 's'}]`
    : isObj
    ? `{${Object.keys(data).length} clave${Object.keys(data).length === 1 ? '' : 's'}}`
    : String(data);

  const formattedJson = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800/90 text-indigo-300 hover:text-indigo-200 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 transition-all cursor-pointer group"
        title="Clic para ver estructura anidada"
        aria-label={`Ver datos anidados de ${label}`}
      >
        <span>{countText}</span>
        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 transition-colors" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`Datos anidados: ${label}`}
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Campo:
                </span>
                <span className="text-sm font-bold text-white font-mono">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                  title="Copiar JSON"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                  aria-label="Cerrar visor anidado"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto font-mono text-xs text-emerald-300 bg-slate-950/70 select-text">
              <pre className="whitespace-pre-wrap leading-relaxed">{formattedJson}</pre>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
