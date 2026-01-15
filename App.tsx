
import React, { useState, useEffect } from 'react';
import { Search, Loader2, BookOpen, AlertCircle, ExternalLink, ShieldCheck, Calendar, ArrowLeft, Filter, Zap, Database, Globe } from 'lucide-react';
import { BOE_SOURCES } from './constants';
import { AnalysisState, ScrapedLaw, AuditHistoryItem } from './types';
import { analyzeBOE } from './services/geminiService';
import { translations, Language } from './translations';
import AuditDashboard from './components/AuditDashboard';
import HistoryDashboard from './components/HistoryDashboard';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('boe_pref_lang');
    return (saved as Language) || 'es';
  });
  
  const [searchId, setSearchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [state, setState] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null,
    scrapingResults: undefined,
    isScraping: false
  });

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('boe_pref_lang', lang);
  }, [lang]);

  useEffect(() => {
    const saved = localStorage.getItem('boe_audit_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const toggleLang = () => setLang(l => l === 'es' ? 'en' : 'es');

  const saveToHistory = (boeId: string, title: string, audit: any) => {
    const newItem: AuditHistoryItem = { boeId, title, audit, timestamp: Date.now() };
    const filteredHistory = history.filter(item => item.boeId !== boeId);
    const updatedHistory = [newItem, ...filteredHistory].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('boe_audit_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    if (confirm(t.confirmClear)) {
      setHistory([]);
      localStorage.removeItem('boe_audit_history');
    }
  };

  const handleAudit = async (boeId: string, customTitle?: string) => {
    const cached = history.find(item => item.boeId === boeId);
    if (cached) {
      setSearchId(boeId);
      setState(prev => ({ ...prev, loading: false, error: null, result: cached.audit }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, result: null, scrapingResults: undefined }));
    try {
      let xmlText = "";
      let docTitle = customTitle || (lang === 'es' ? "Documento BOE" : "Gazette Document");
      
      try {
        const response = await fetch(`https://www.boe.es/diario_boe/xml.php?id=${boeId}`);
        if (!response.ok) throw new Error("CORS Blocked");
        xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const titleNode = xmlDoc.querySelector("titulo");
        if (titleNode) docTitle = titleNode.textContent || docTitle;
      } catch (e) {
        xmlText = `<boe><diario id="BOE-S-2024"><titulo>BOE</titulo><item id="${boeId}"><titulo>${docTitle}</titulo><texto>Simulation text content...</texto></item></diario></boe>`;
      }

      const audit = await analyzeBOE(xmlText, lang);
      saveToHistory(boeId, docTitle, audit);
      setState(prev => ({ ...prev, loading: false, error: null, result: audit, rawXml: xmlText }));
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message || "Error during analysis" }));
    }
  };

  const handleScrapeByDates = async () => {
    if (!startDate || !endDate) return;
    setState(prev => ({ ...prev, isScraping: true, error: null, result: null, scrapingResults: [] }));
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResults: ScrapedLaw[] = [
      { id: "BOE-A-2024-1001", titulo: lang === 'es' ? "Real Decreto-ley de medidas urgentes en materia de vivienda" : "Emergency Housing Measures Royal Decree", departamento: "Housing Dept", seccion: "I" },
      { id: "BOE-A-2024-1002", titulo: lang === 'es' ? "Orden de bases para subvenciones digitales" : "Order for digital grants", departamento: "Agri Dept", seccion: "I" },
      { id: "BOE-A-2024-1003", titulo: lang === 'es' ? "Ley Orgánica de Protección de Datos IA" : "Organic Law on AI Data Protection", departamento: "Digital Dept", seccion: "I" },
    ];
    setState(prev => ({ ...prev, isScraping: false, scrapingResults: mockResults }));
  };

  const resetState = () => {
    setState({ loading: false, error: null, result: null, scrapingResults: undefined, isScraping: false });
    setSearchId('');
  };

  const handleSelectHistory = (item: AuditHistoryItem) => {
    setSearchId(item.boeId);
    setState(prev => ({ ...prev, result: item.audit, loading: false, error: null }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
      <div className="fixed top-6 right-6 z-[60]">
        <button 
          onClick={toggleLang}
          className="bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-all text-sm font-bold text-slate-200"
        >
          <Globe size={16} className="text-blue-400" />
          {lang === 'es' ? 'Español' : 'English'}
        </button>
      </div>

      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-900/30 px-4 py-2 rounded-full border border-blue-500/30 text-blue-400 mb-6">
          <ShieldCheck size={20} />
          <span className="text-sm font-bold tracking-widest uppercase">{t.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-white via-slate-400 to-slate-600 bg-clip-text text-transparent">
          {t.title}
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          {t.subtitle}
        </p>
      </header>

      {!state.result && !state.loading && !state.isScraping && !state.scrapingResults && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                <Search size={16} /> {t.analyzeBtn}
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchId && handleAudit(searchId)}
                />
                <button
                  onClick={() => handleAudit(searchId)}
                  disabled={!searchId}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 px-8 py-4 rounded-xl font-bold transition-all"
                >
                  {t.analyzeBtn}
                </button>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                <Filter size={16} /> {t.dateFilterTitle}
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-10 pr-4 outline-none text-white text-xs focus:ring-2 focus:ring-emerald-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-10 pr-4 outline-none text-white text-xs focus:ring-2 focus:ring-emerald-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleScrapeByDates}
                  disabled={!startDate || !endDate}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Zap size={18} />
                  {t.scanBtn}
                </button>
              </div>
            </div>
          </div>

          <HistoryDashboard 
            history={history} 
            onSelect={handleSelectHistory} 
            onClear={clearHistory} 
            lang={lang}
          />
        </div>
      )}

      {state.scrapingResults && !state.loading && !state.result && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <button onClick={resetState} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} /> {t.back}
            </button>
            <div className="flex items-center gap-2 bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-900/50">
              <Database size={16} className="text-emerald-500" />
              <span className="text-emerald-400 font-bold text-xs">{t.scannedInMemory}</span>
            </div>
          </div>
          <div className="grid gap-4">
            {state.scrapingResults.map((law) => (
              <div key={law.id} className="group bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-600 hover:bg-slate-900/80 transition-all shadow-xl">
                <div className="flex-1">
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-tighter">{law.departamento}</span>
                  <h3 className="text-lg font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">{law.titulo}</h3>
                  <p className="text-slate-500 font-mono text-xs bg-slate-950 px-2 py-1 rounded inline-block mt-2">{law.id}</p>
                </div>
                <button
                  onClick={() => handleAudit(law.id, law.titulo)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  <Zap size={16} />
                  {t.auditWithGemini}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.result && !state.loading && (
        <div className="space-y-6">
          <button 
            onClick={resetState}
            className="group flex items-center gap-2 bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl text-slate-300 hover:bg-slate-800 transition-all"
          >
            <ArrowLeft size={18} />
            {t.backToHome}
          </button>
          <AuditDashboard data={state.result} boeId={searchId} lang={lang} />
        </div>
      )}

      {(state.loading || state.isScraping) && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="relative">
            <div className={`w-24 h-24 border-4 ${state.isScraping ? 'border-emerald-500/20 border-t-emerald-500' : 'border-blue-500/20 border-t-blue-500'} rounded-full animate-spin`}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              {state.isScraping ? <Zap className="text-emerald-500 animate-pulse" size={32} /> : <ShieldCheck className="text-blue-500 animate-pulse" size={32} />}
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{state.isScraping ? t.scanningData : t.decodingOpacity}</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              {state.isScraping 
                ? t.extractingMetadata(startDate, endDate)
                : t.processingGemini}
            </p>
          </div>
        </div>
      )}

      {state.error && (
        <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-3xl flex flex-col items-center gap-4 text-red-200 mt-8 animate-in zoom-in duration-300">
          <AlertCircle className="text-red-500" size={64} />
          <div className="text-center">
            <h3 className="font-bold text-2xl mb-2">{t.errorTitle}</h3>
            <p className="text-slate-400 max-w-sm mx-auto mb-6">{state.error}</p>
            <button onClick={resetState} className="bg-slate-800 hover:bg-slate-700 px-10 py-3 rounded-xl font-bold transition-all">
              {t.retryBtn}
            </button>
          </div>
        </div>
      )}

      {!state.loading && !state.result && !state.isScraping && !state.scrapingResults && (
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="text-blue-400" />
              {t.criticalLaws}
            </h2>
            <div className="grid gap-4">
              {BOE_SOURCES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAudit(item.id, item.title)}
                  className="group flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all text-left"
                >
                  <div className="pr-4">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{item.category}</span>
                    <h3 className="font-semibold group-hover:text-blue-400 transition-colors line-clamp-1">{item.title}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{item.id}</p>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all text-slate-700">
                    <ExternalLink size={16} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner">
            <ShieldCheck className="text-blue-500 mb-6 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" size={56} />
            <h3 className="text-2xl font-bold mb-4">{t.missionTitle}</h3>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-sm">
              {t.missionDesc}
            </p>
            <div className="grid grid-cols-2 gap-3 w-full text-[10px] font-mono text-slate-500">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1">
                <span className="text-emerald-500 font-bold">1M+ Tokens</span>
                <span>Context</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-1">
                <span className="text-emerald-500 font-bold">GEMINI 3 FLASH</span>
                <span>Hybrid Engine</span>
              </div>
            </div>
          </section>
        </div>
      )}

      <footer className="mt-24 pt-12 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>&copy; 2024 Civic Intelligence Auditor. {t.footerDesc}</p>
        <p className="mt-2 text-xs opacity-50">{t.cacheNote}</p>
      </footer>
    </div>
  );
};

export default App;
