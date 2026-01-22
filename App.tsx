
import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Globe, Lock, LogOut, User, Radio, History, BookmarkCheck, Database, Zap, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { BOE_SOURCES } from './constants';
import { AnalysisState, ScrapedLaw, AuditHistoryItem, BOEAuditResponse } from './types';
import { analyzeBOE, generateThumbnail, generateVideoSummary } from './services/geminiService';
import { translations, Language } from './translations';
import { getAuditHistory, saveAuditToDB, clearLocalHistory } from './services/supabaseService';
import AuditDashboard from './components/AuditDashboard';
import HistoryDashboard from './components/HistoryDashboard';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('boe_pref_lang');
    return (saved as Language) || 'es';
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('boe_agent_session') === 'active';
  });

  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [latestArticles, setLatestArticles] = useState<ScrapedLaw[]>([]);
  const [isFetchingLatest, setIsFetchingLatest] = useState(false);

  const [state, setState] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null,
    scrapingResults: undefined,
    isScraping: false,
    thumbnailUrl: undefined,
    isGeneratingThumbnail: false,
    videoUrl: undefined,
    isGeneratingVideo: false
  });

  const t = translations[lang];
  const requiredPassword = (process.env as any).AGENT_PASSWORD;

  useEffect(() => {
    localStorage.setItem('boe_pref_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (isLoggedIn) {
      loadHistory();
      fetchLatestBOE();
    }
  }, [isLoggedIn]);

  const fetchLatestBOE = async () => {
    setIsFetchingLatest(true);
    try {
      const response = await fetch('https://www.boe.es/diario_boe/xml.php');
      if (!response.ok) throw new Error("CORS or Network error");
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const items = xml.querySelectorAll('item');

      const articles: ScrapedLaw[] = Array.from(items).slice(0, 50).map((item: any) => ({
        id: item.getAttribute('id') || '',
        titulo: item.querySelector('titulo')?.textContent || 'Sin título',
        departamento: item.closest('departamento')?.querySelector('nombre')?.textContent || 'Varios',
        seccion: 'I'
      }));

      if (articles.length === 0) throw new Error("No items in today's BOE");
      setLatestArticles(articles);
    } catch (e) {
      console.warn("Failed to fetch live BOE, using sources as fallback", e);
      setLatestArticles(BOE_SOURCES.map(s => ({
        id: s.id,
        titulo: s.title,
        departamento: s.category,
        seccion: 'I'
      })));
    } finally {
      setIsFetchingLatest(false);
    }
  };

  const loadHistory = async () => {
    const data = await getAuditHistory();
    setHistory(data);
  };

  const handleClearHistory = () => {
    if (window.confirm(t.confirmClear)) {
      clearLocalHistory();
      setHistory([]);
    }
  };

  const toggleLang = () => setLang(l => l === 'es' ? 'en' : 'es');

  const handleLogin = () => {
    if (requiredPassword) {
      if (password === requiredPassword) {
        setIsLoggedIn(true);
        localStorage.setItem('boe_agent_session', 'active');
        setLoginError(false);
      } else {
        setLoginError(true);
        setTimeout(() => setLoginError(false), 3000);
      }
    } else {
      // Si no hay contraseña configurada en el entorno, permitimos acceso libre por defecto
      setIsLoggedIn(true);
      localStorage.setItem('boe_agent_session', 'active');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('boe_agent_session');
    resetState();
  };

  const handleGenerateThumbnail = async (audit: BOEAuditResponse) => {
    setState(prev => ({ ...prev, isGeneratingThumbnail: true }));
    try {
      const url = await generateThumbnail(audit, lang);
      setState(prev => ({ ...prev, isGeneratingThumbnail: false, thumbnailUrl: url }));
    } catch (err: any) {
      console.error("Image generation failed", err);
      setState(prev => ({ ...prev, isGeneratingThumbnail: false }));
    }
  };

  const handleGenerateVideo = async (audit: BOEAuditResponse) => {
    setState(prev => ({ ...prev, isGeneratingVideo: true, error: null }));
    try {
      const url = await generateVideoSummary(audit, lang);
      setState(prev => ({ ...prev, isGeneratingVideo: false, videoUrl: url }));
    } catch (err: any) {
      console.error("Video generation failed", err);
      setState(prev => ({ ...prev, isGeneratingVideo: false, error: "Video generation failed: " + err.message }));
    }
  };

  const handleAudit = async (boeId: string, customTitle?: string) => {
    setSearchId(boeId);

    const cached = history.find(item => item.boeId === boeId);
    if (cached) {
      setState(prev => ({ ...prev, loading: false, error: null, result: cached.audit, thumbnailUrl: undefined, videoUrl: undefined }));
      handleGenerateThumbnail(cached.audit);
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null, result: null, scrapingResults: undefined, thumbnailUrl: undefined, videoUrl: undefined }));
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
        xmlText = `<boe><diario id="BOE-S-2024"><titulo>BOE</titulo><item id="${boeId}"><titulo>${docTitle}</titulo><texto>Contenido simulado para auditoría...</texto></item></diario></boe>`;
      }

      const audit = await analyzeBOE(xmlText, lang);
      await saveAuditToDB(boeId, docTitle, audit);
      await loadHistory();

      setState(prev => ({ ...prev, loading: false, error: null, result: audit }));
      handleGenerateThumbnail(audit);

    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message || "Error during analysis" }));
    }
  };

  const handleImportData = async (data: any) => {
    try {
      if (Array.isArray(data)) {
        // Bulk import of AuditHistoryItem[]
        for (const item of data) {
          if (item.boeId && item.title && item.audit) {
            await saveAuditToDB(item.boeId, item.title, item.audit);
          }
        }
      } else if (data.boe_id && data.report) {
        // Single report import from Download format
        await saveAuditToDB(data.boe_id, data.title || data.boe_id, data.report);
      } else if (data.boeId && data.audit) {
        // Single AuditHistoryItem import
        await saveAuditToDB(data.boeId, data.title || data.boeId, data.audit);
      } else {
        throw new Error("Invalid Format");
      }

      await loadHistory();
      alert(t.importSuccess);
    } catch (err) {
      console.error("Import failed", err);
      alert(t.importError);
    }
  };

  const resetState = () => {
    setState({ loading: false, error: null, result: null, scrapingResults: undefined, isScraping: false, thumbnailUrl: undefined, isGeneratingThumbnail: false, videoUrl: undefined, isGeneratingVideo: false });
    setSearchId('');
  };

  const handleSelectHistory = (item: AuditHistoryItem) => {
    setSearchId(item.boeId);
    setState(prev => ({ ...prev, result: item.audit, loading: false, error: null, thumbnailUrl: undefined, videoUrl: undefined }));
    handleGenerateThumbnail(item.audit);
  };

  const isAlreadyAudited = (id: string) => history.some(h => h.boeId === id);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>

        <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl text-center space-y-8 relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-600/10 rounded-3xl border border-blue-600/20 text-blue-500 mb-2 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Lock size={48} />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight text-white">{t.loginTitle}</h1>
            <p className="text-slate-400 text-sm">{t.loginSubtitle}</p>
          </div>

          <div className="space-y-4">
            {requiredPassword && (
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <KeyRound size={18} />
                </div>
                <input
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className={`w-full bg-slate-950/50 border ${loginError ? 'border-red-500 animate-shake' : 'border-slate-800 group-hover:border-slate-700 focus:border-blue-500'} rounded-2xl py-4 pl-12 pr-4 outline-none text-white transition-all font-mono`}
                />
                {loginError && (
                  <p className="text-[10px] text-red-400 mt-2 text-left font-medium">{t.invalidPassword}</p>
                )}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />
              {t.loginBtn}
            </button>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
              <div className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gemini API</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
              <div className={`w-2 h-2 rounded-full ${requiredPassword ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-600'}`}></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Secure Link</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
      <div className="fixed top-6 right-6 z-[60] flex items-center gap-3">
        <button onClick={toggleLang} className="bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-all text-sm font-bold text-slate-200">
          <Globe size={16} className="text-blue-400" />
          {lang.toUpperCase()}
        </button>
        <button onClick={handleLogout} className="bg-red-900/20 border border-red-900/30 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-red-900/40 transition-all text-sm font-bold text-red-400">
          <LogOut size={16} />
          {t.logoutBtn}
        </button>
      </div>

      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-900/30 px-4 py-2 rounded-full border border-blue-500/30 text-blue-400 mb-6">
          <User size={16} /><span className="text-sm font-bold tracking-widest uppercase">Agent #0412 · {t.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-white via-slate-400 to-slate-600 bg-clip-text text-transparent">{t.title}</h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">{t.subtitle}</p>
      </header>

      {state.result ? (
        <div className="space-y-6">
          <button onClick={resetState} className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl text-slate-300 hover:bg-slate-800 transition-all"><ArrowLeft size={18} /> {t.backToHome}</button>
          <AuditDashboard
            data={state.result}
            boeId={searchId}
            lang={lang}
            thumbnailUrl={state.thumbnailUrl}
            isGeneratingThumbnail={state.isGeneratingThumbnail}
            onGenerateThumbnail={() => state.result && handleGenerateThumbnail(state.result)}
            videoUrl={state.videoUrl}
            isGeneratingVideo={state.isGeneratingVideo}
            onGenerateVideo={() => state.result && handleGenerateVideo(state.result)}
          />
        </div>
      ) : state.loading || state.isScraping ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{state.isScraping ? t.scanningData : t.decodingOpacity}</h2>
            <p className="text-slate-400 max-w-md mx-auto">{t.processingGemini}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-16 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <Radio className="text-red-500 animate-pulse" size={24} />
                    {t.latestRadarTitle}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">{t.latestRadarSubtitle}</p>
                </div>
                {isFetchingLatest && <Loader2 className="animate-spin text-slate-500" size={20} />}
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {latestArticles.map((art) => {
                  const audited = isAlreadyAudited(art.id);
                  return (
                    <div key={art.id} className={`bg-slate-900/40 border p-4 rounded-2xl transition-all flex flex-col justify-between group relative overflow-hidden ${audited ? 'border-emerald-500/20' : 'border-slate-800 hover:border-blue-500/30'}`}>
                      {audited && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-500/30">
                          <BookmarkCheck size={10} />
                          {t.alreadyAudited}
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block mb-1">{art.departamento}</span>
                        <h3 className="text-sm font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-white">{art.titulo}</h3>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] text-slate-600 font-mono">{art.id}</span>
                        <button
                          onClick={() => handleAudit(art.id, art.titulo)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${audited ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 hover:bg-emerald-600 hover:text-white' : 'bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600 hover:text-white'}`}
                        >
                          <Zap size={10} />
                          {audited ? t.back : t.auditWithGemini}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <History className="text-purple-500" size={24} />
                    {t.historyTitle}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">{t.historySubtitle}</p>
                </div>
              </div>

              <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-4 min-h-[400px]">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-600 opacity-40 italic text-sm">
                    <Database size={48} className="mb-4" />
                    No hay auditorías procesadas aún
                  </div>
                ) : (
                  <HistoryDashboard
                    history={history}
                    onSelect={handleSelectHistory}
                    onClear={handleClearHistory}
                    onImport={handleImportData}
                    lang={lang}
                  />
                )}
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl shadow-2xl mt-8">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2"><Search size={14} /> Búsqueda por ID</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder={t.searchPlaceholder} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 outline-none text-white text-sm" value={searchId} onChange={(e) => setSearchId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchId && handleAudit(searchId)} />
                  <button onClick={() => handleAudit(searchId)} disabled={!searchId} className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 px-6 rounded-xl font-bold text-sm transition-all">{t.analyzeBtn}</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {state.error && (
        <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-3xl flex flex-col items-center gap-4 text-red-200 mt-8">
          <AlertCircle className="text-red-500" size={64} /><h3 className="font-bold text-2xl">{t.errorTitle}</h3><p className="text-slate-400">{state.error}</p>
          <button onClick={resetState} className="bg-slate-800 hover:bg-slate-700 px-10 py-3 rounded-xl font-bold">{t.retryBtn}</button>
        </div>
      )}

      <footer className="mt-24 pt-12 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>&copy; 2024 Civic Intelligence Auditor. {t.footerDesc}</p>
      </footer>
    </div>
  );
};

export default App;
