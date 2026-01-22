
import React from 'react';
import { AuditHistoryItem } from '../types';
import { ChevronRight, BarChart3, ExternalLink, Download, Upload, FileJson } from 'lucide-react';
import { translations, Language } from '../translations';

interface Props {
  history: AuditHistoryItem[];
  onSelect: (item: AuditHistoryItem) => void;
  onClear: () => void;
  onImport: (data: any) => void;
  lang: Language;
}

const HistoryDashboard: React.FC<Props> = ({ history, onSelect, onClear, onImport, lang }) => {
  const t = translations[lang];

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BOE_Audit_Full_History_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImport(json);
      } catch (err) {
        alert(t.importError);
      }
    };
    reader.readAsText(file);
  };

  const handleExportIndex = () => {
    const index = history.map(item => ({
      id: item.boeId,
      titulo: item.title,
      url_boe: `https://www.boe.es/buscar/doc.php?id=${item.boeId}`,
      transparencia: item.audit.nivel_transparencia,
      fecha_auditoria: new Date(item.timestamp).toISOString()
    }));

    const blob = new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BOE_Audit_Index_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleExportIndex}
          disabled={history.length === 0}
          className="bg-emerald-600/10 hover:bg-emerald-600 disabled:opacity-30 text-emerald-400 hover:text-white px-2 py-2 rounded-xl text-[9px] font-bold transition-all border border-emerald-600/20 flex items-center justify-center gap-1.5"
        >
          <Download size={10} />
          {t.exportHistoryJson}
        </button>
        <button
          onClick={handleExportAll}
          disabled={history.length === 0}
          className="bg-blue-600/10 hover:bg-blue-600 disabled:opacity-30 text-blue-400 hover:text-white px-2 py-2 rounded-xl text-[9px] font-bold transition-all border border-blue-600/20 flex items-center justify-center gap-1.5"
        >
          <FileJson size={10} />
          {t.exportAllJson}
        </button>
        <label className="cursor-pointer bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white px-2 py-2 rounded-xl text-[9px] font-bold transition-all border border-purple-600/20 flex items-center justify-center gap-1.5">
          <Upload size={10} />
          {t.importJson}
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button
          onClick={onClear}
          disabled={history.length === 0}
          className="bg-slate-800 hover:bg-red-900/40 disabled:opacity-30 text-slate-500 hover:text-red-400 px-2 py-2 rounded-xl text-[9px] font-bold transition-all border border-slate-700"
        >
          {t.clearHistory}
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600 opacity-40 italic text-xs">
            No hay auditorías procesadas aún
          </div>
        )}
        {history.map((item) => (
          <div
            key={`${item.boeId}-${item.timestamp}`}
            className="group relative bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl hover:bg-slate-900 transition-all text-left shadow-lg flex flex-col"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{item.boeId}</span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.boe.es/buscar/doc.php?id=${item.boeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-blue-400 transition-colors"
                  title={t.viewOfficial}
                >
                  <ExternalLink size={12} />
                </a>
                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 border border-emerald-900/30">
                  <BarChart3 size={9} />
                  {item.audit.nivel_transparencia}%
                </div>
              </div>
            </div>

            <button onClick={() => onSelect(item)} className="text-left">
              <h3 className="font-bold text-slate-200 line-clamp-2 text-xs leading-tight mb-3 group-hover:text-purple-400 transition-colors">
                {item.title}
              </h3>

              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-1000 ${item.audit.nivel_transparencia > 70 ? 'bg-emerald-500' : item.audit.nivel_transparencia > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${item.audit.nivel_transparencia}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[8px] text-slate-500 italic">
                <span>{t.auditedOn(new Date(item.timestamp).toLocaleDateString())}</span>
                <ChevronRight size={10} className="text-purple-500 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryDashboard;
