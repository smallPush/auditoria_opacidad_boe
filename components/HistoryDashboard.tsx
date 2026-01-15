
import React from 'react';
import { AuditHistoryItem } from '../types';
import { History, Trash2, ChevronRight, BarChart3 } from 'lucide-react';
import { translations, Language } from '../translations';

interface Props {
  history: AuditHistoryItem[];
  onSelect: (item: AuditHistoryItem) => void;
  onClear: () => void;
  lang: Language;
}

const HistoryDashboard: React.FC<Props> = ({ history, onSelect, onClear, lang }) => {
  const t = translations[lang];
  if (history.length === 0) return null;

  return (
    <section className="space-y-6 mt-12 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="text-purple-400" />
          {t.historyTitle}
        </h2>
        <button 
          onClick={onClear}
          className="text-slate-500 hover:text-red-400 flex items-center gap-1 text-sm transition-colors"
        >
          <Trash2 size={14} />
          {t.clearHistory}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((item) => (
          <button
            key={`${item.boeId}-${item.timestamp}`}
            onClick={() => onSelect(item)}
            className="group relative bg-slate-900/40 border border-slate-800 p-5 rounded-2xl hover:bg-slate-800/60 hover:border-purple-500/30 transition-all text-left overflow-hidden shadow-lg"
          >
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
               <ChevronRight className="text-purple-400" />
            </div>
            
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{item.boeId}</span>
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-400 border border-slate-800">
                <BarChart3 size={10} />
                {item.audit.nivel_transparencia}%
              </div>
            </div>

            <h3 className="font-bold text-slate-200 line-clamp-2 text-sm leading-tight mb-4 group-hover:text-white">
              {item.title}
            </h3>

            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${item.audit.nivel_transparencia > 70 ? 'bg-emerald-500' : item.audit.nivel_transparencia > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${item.audit.nivel_transparencia}%` }}
              />
            </div>
            
            <p className="text-[10px] text-slate-500 mt-3 italic">
              {t.auditedOn(new Date(item.timestamp).toLocaleDateString())}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HistoryDashboard;
