import React from 'react';
import { AuditHistoryItem } from '../types';
import { ChevronRight, BarChart3, ExternalLink, Download, Upload, FileJson, Search, Filter, Tag, MapPin } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { translations, Language } from '../translations';
import Pagination from './Pagination';

interface Props {
  history: AuditHistoryItem[];
  onClear: () => void;
  onImport: (data: any) => void;
  lang: Language;
  isLoggedIn?: boolean;
}

const HistoryDashboard: React.FC<Props> = ({ history, onClear, onImport, lang, isLoggedIn }) => {
  const t = translations[lang];
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [minTransparency, setMinTransparency] = React.useState(parseInt(searchParams.get('min') || '0'));
  const [maxTransparency, setMaxTransparency] = React.useState(parseInt(searchParams.get('max') || '100'));
  const [selectedTag, setSelectedTag] = React.useState(searchParams.get('tag') || '');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  React.useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchTerm, minTransparency, maxTransparency, selectedTag]);

  React.useEffect(() => {
    const tagFromUrl = searchParams.get('tag');
    if (tagFromUrl) setSelectedTag(tagFromUrl);

    const minFromUrl = searchParams.get('min');
    if (minFromUrl) setMinTransparency(parseInt(minFromUrl));

    const maxFromUrl = searchParams.get('max');
    if (maxFromUrl) setMaxTransparency(parseInt(maxFromUrl));
  }, [searchParams]);

  const handleFilterChange = (updates: { tag?: string, min?: number, max?: number }) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (updates.tag !== undefined) {
      setSelectedTag(updates.tag);
      if (updates.tag) newParams.set('tag', updates.tag);
      else newParams.delete('tag');
    }

    if (updates.min !== undefined) {
      setMinTransparency(updates.min);
      newParams.set('min', updates.min.toString());
    }

    if (updates.max !== undefined) {
      setMaxTransparency(updates.max);
      newParams.set('max', updates.max.toString());
    }

    setSearchParams(newParams);
  };

  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    history.forEach(item => {
      if (item.audit.comunidad_autonoma) tags.add(item.audit.comunidad_autonoma);
      if (item.audit.tipologia) tags.add(item.audit.tipologia);
    });
    return Array.from(tags).sort();
  }, [history]);

  const filteredHistory = React.useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.boeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTransparency = item.audit.nivel_transparencia >= minTransparency &&
        item.audit.nivel_transparencia <= maxTransparency;
      
      const matchesTag = !selectedTag ||
        item.audit.comunidad_autonoma === selectedTag ||
        item.audit.tipologia === selectedTag ||
        (item.audit.banderas_rojas && item.audit.banderas_rojas.includes(selectedTag));

      return matchesSearch && matchesTransparency && matchesTag;
    });
  }, [history, searchTerm, minTransparency, maxTransparency, selectedTag]);

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
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <Filter size={14} className="text-slate-500" />
              <span className="text-xs text-slate-400 whitespace-nowrap">{t.minTransparency}:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={minTransparency}
                onChange={(e) => handleFilterChange({ min: parseInt(e.target.value) })}
                className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs font-mono text-blue-400 w-8 text-right">{minTransparency}%</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <Filter size={14} className="text-slate-500" />
              <span className="text-xs text-slate-400 whitespace-nowrap">{t.maxTransparency}:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={maxTransparency}
                onChange={(e) => handleFilterChange({ max: parseInt(e.target.value) })}
                className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <span className="text-xs font-mono text-red-400 w-8 text-right">{maxTransparency}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <Tag size={14} className="text-slate-500" />
            <select
              className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
              value={selectedTag}
              onChange={(e) => handleFilterChange({ tag: e.target.value })}
            >
              <option value="">{t.allTags}</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoggedIn && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleExportIndex}
              disabled={history.length === 0}
              className="bg-emerald-600/10 hover:bg-emerald-600 disabled:opacity-30 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-emerald-600/20 flex items-center gap-1.5"
            >
              <Download size={12} />
              {t.exportHistoryJson}
            </button>
            <button
              onClick={handleExportAll}
              disabled={history.length === 0}
              className="bg-blue-600/10 hover:bg-blue-600 disabled:opacity-30 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-blue-600/20 flex items-center gap-1.5"
            >
              <FileJson size={12} />
              {t.exportAllJson}
            </button>
            <label className="cursor-pointer bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-purple-600/20 flex items-center gap-1.5">
              <Upload size={12} />
              {t.importJson}
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={onClear}
              disabled={history.length === 0}
              className="bg-slate-800 hover:bg-red-900/40 disabled:opacity-30 text-slate-500 hover:text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-slate-700 ml-auto"
            >
              {t.clearHistory}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[400px]">
        {filteredHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-40 italic text-sm">
            No se han encontrado auditorías que coincidan con los filtros
          </div>
        )}
        {filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
          <div
            key={`${item.boeId}-${item.timestamp}`}
            className="group relative bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl hover:bg-slate-900 hover:border-blue-500/30 transition-all text-left shadow-lg flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{item.boeId}</span>
                {item.audit.comunidad_autonoma && (
                  <span className="flex items-center gap-1 bg-blue-950/40 text-blue-400 px-2 py-0.5 rounded text-[9px] border border-blue-900/50">
                    <MapPin size={8} /> {item.audit.comunidad_autonoma}
                  </span>
                )}
                {item.audit.tipologia && (
                  <span className="flex items-center gap-1 bg-purple-950/40 text-purple-400 px-2 py-0.5 rounded text-[9px] border border-purple-900/50">
                    <Tag size={8} /> {item.audit.tipologia}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.boe.es/buscar/doc.php?id=${item.boeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-blue-400 transition-colors"
                  title={t.viewOfficial}
                >
                  <ExternalLink size={14} />
                </a>
                <div className={`flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg text-[10px] font-bold border ${item.audit.nivel_transparencia >= 70 ? 'text-emerald-400 border-emerald-900/30' : item.audit.nivel_transparencia > 33 ? 'text-amber-400 border-amber-900/30' : 'text-red-400 border-red-900/30'}`}>
                  <BarChart3 size={10} />
                  {item.audit.nivel_transparencia}%
                </div>
              </div>
            </div>

            <Link to={`/audit/${item.boeId}`} className="text-left group/btn">
              <h3 className="font-bold text-slate-200 line-clamp-2 text-sm leading-snug mb-4 group-hover/btn:text-blue-400 transition-colors">
                {item.title}
              </h3>

              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800/50">
                <div
                  className={`h-full transition-all duration-1000 ${item.audit.nivel_transparencia >= 70 ? 'bg-emerald-500' : item.audit.nivel_transparencia > 33 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${item.audit.nivel_transparencia}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  {t.auditedOn(new Date(item.timestamp).toLocaleDateString())}
                </span>
                <span className="flex items-center gap-1 text-blue-400 font-bold opacity-0 group-hover/btn:opacity-100 transition-all transform translate-x-2 group-hover/btn:translate-x-0">
                  {t.goToAudit} <ChevronRight size={10} />
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(filteredHistory.length / itemsPerPage)}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredHistory.length}
        label="Auditorías"
      />
    </div>
  );
};

export default HistoryDashboard;
