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
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = React.useState(false);
  const tagDropdownRef = React.useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  React.useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchTerm, minTransparency, maxTransparency, selectedTags]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const tagsFromUrl = searchParams.get('tags');
    if (tagsFromUrl) {
      setSelectedTags(tagsFromUrl.split(',').filter(Boolean));
    } else {
      setSelectedTags([]);
    }

    const minFromUrl = searchParams.get('min');
    if (minFromUrl) setMinTransparency(parseInt(minFromUrl));

    const maxFromUrl = searchParams.get('max');
    if (maxFromUrl) setMaxTransparency(parseInt(maxFromUrl));
  }, [searchParams]);

  const handleFilterChange = (updates: { tags?: string[], min?: number, max?: number }) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (updates.tags !== undefined) {
      setSelectedTags(updates.tags);
      if (updates.tags.length > 0) newParams.set('tags', updates.tags.join(','));
      else newParams.delete('tags');
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

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    handleFilterChange({ tags: newTags });
  };

  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    history.forEach(item => {
      if (item.audit.comunidad_autonoma) tags.add(item.audit.comunidad_autonoma);
      if (item.audit.tipologia) tags.add(item.audit.tipologia);
      // We could add flags too, but let's stick to categories for now to keep list manageable
    });
    return Array.from(tags).sort();
  }, [history]);

  const filteredHistory = React.useMemo(() => {
    return history.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.boeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTransparency = item.audit.nivel_transparencia >= minTransparency &&
        item.audit.nivel_transparencia <= maxTransparency;
      
      const matchesTag = selectedTags.length === 0 ||
        (item.audit.comunidad_autonoma && selectedTags.includes(item.audit.comunidad_autonoma)) ||
        (item.audit.tipologia && selectedTags.includes(item.audit.tipologia)) ||
        (item.audit.banderas_rojas && item.audit.banderas_rojas.some(flag => selectedTags.includes(flag)));

      return matchesSearch && matchesTransparency && matchesTag;
    });
  }, [history, searchTerm, minTransparency, maxTransparency, selectedTags]);

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

          <div className="relative" ref={tagDropdownRef}>
            <button
              onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
              className={`flex items-center gap-2 bg-slate-950 border ${selectedTags.length > 0 ? 'border-blue-500/50 text-blue-400' : 'border-slate-800 text-slate-400'} rounded-xl px-3 py-2 text-xs transition-all hover:border-slate-700`}
            >
              <Tag size={14} />
              <span>{selectedTags.length > 0 ? `${selectedTags.length} filtros` : t.allTags}</span>
            </button>
            
            {isTagDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 custom-scrollbar">
                {allTags.length === 0 ? (
                  <div className="p-2 text-slate-500 text-xs italic text-center">No tags available</div>
                ) : (
                  <div className="space-y-1">
                    {allTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <label key={tag} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'hover:bg-slate-800'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-transparent'}`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => toggleTag(tag)}
                          />
                          <span className={`text-xs ${isSelected ? 'text-blue-200 font-medium' : 'text-slate-300'}`}>{tag}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
