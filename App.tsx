
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { Search, Loader2, AlertCircle, Globe, Lock, LogOut, User, Radio, History, BookmarkCheck, Database, Zap, ArrowLeft, ShieldCheck, KeyRound, FileJson, ExternalLink } from 'lucide-react';
import { BOE_SOURCES } from './constants';
import { AnalysisState, ScrapedLaw, AuditHistoryItem, BOEAuditResponse } from './types';
import { analyzeBOE } from './services/geminiService';
import { translations, Language } from './translations';
import { getAuditHistory, saveAuditToDB, clearLocalHistory } from './services/supabaseService';
import AuditDashboard from './components/AuditDashboard';
import HistoryDashboard from './components/HistoryDashboard';
import Navbar from './components/Navbar';
import GoogleAnalytics from './components/GoogleAnalytics';
import AuditTrigger from './components/AuditTrigger';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('boe_pref_lang');
    return (saved as Language) || 'es';
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('boe_agent_session') === 'active';
  });
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [latestArticles, setLatestArticles] = useState<ScrapedLaw[]>([]);
  const [isFetchingLatest, setIsFetchingLatest] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null,
    scrapingResults: undefined,
    isScraping: false
  });

  const t = translations[lang];
  const requiredPassword = (process.env as any).AGENT_PASSWORD;

  useEffect(() => {
    localStorage.setItem('boe_pref_lang', lang);
  }, [lang]);

  useEffect(() => {
    loadHistory();
    fetchLatestBOE();
  }, []);

  const fetchLatestBOE = async () => {
    setIsFetchingLatest(true);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');

    const urls = [
      `https://www.boe.es/datosabiertos/api/boe/sumario/${today}`,
      `https://www.boe.es/datosabiertos/api/boe/sumario/${yesterday}`,
      'https://www.boe.es/diario_boe/xml.php'
    ];

    let foundArticles: ScrapedLaw[] = [];

    for (const url of urls) {
      if (foundArticles.length > 0) break;

      try {
        console.log(`🔍 Try fetching BOE from: ${url}`);
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/xml',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AuditoriaCívica/1.0'
          }
        });
        if (!response.ok) continue;

        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');

        // Handle both possible structures (REST API vs legacy xml.php)
        const items = xml.querySelectorAll('item');
        if (items.length === 0) continue;

        foundArticles = Array.from(items).map((item: any) => {
          // Identificador can be in an attribute (xml.php) or in a child node (REST API)
          const id = item.getAttribute('id') || item.querySelector('identificador')?.textContent || '';
          const titulo = item.querySelector('titulo')?.textContent || 'Sin título';

          // Structure mapping:
          // REST API: item -> departamento (parent) @nombre
          // xml.xml: item -> departamento (ancestor) -> nombre
          const deptNode = item.closest('departamento');
          const departamento = deptNode?.getAttribute('nombre') || deptNode?.querySelector('nombre')?.textContent || 'Varios';

          const seccionNode = item.closest('seccion');
          const seccionName = seccionNode?.getAttribute('nombre') || seccionNode?.querySelector('nombre')?.textContent || 'I';

          return { id, titulo, departamento, seccion: seccionName };
        });
      } catch (e) {
        console.warn(`Failed to fetch from ${url}:`, e);
      }
    }

    if (foundArticles.length > 0) {
      setLatestArticles(foundArticles);
    } else {
      console.warn("Using sources as fallback");
      setLatestArticles(BOE_SOURCES.map(s => ({
        id: s.id,
        titulo: s.title,
        departamento: s.category,
        seccion: 'I'
      })));
    }
    setIsFetchingLatest(false);
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
        setShowLogin(false);
      } else {
        setLoginError(true);
        setTimeout(() => setLoginError(false), 3000);
      }
    } else {
      // Si no hay contraseña configurada en el entorno, permitimos acceso libre por defecto
      setIsLoggedIn(true);
      localStorage.setItem('boe_agent_session', 'active');
      setShowLogin(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('boe_agent_session');
    resetState();
  };

  const handleAudit = (boeId: string) => {
    navigate(`/audit/${boeId}`);
  };

  const performAudit = async (boeId: string, customTitle?: string) => {
    const cached = history.find(item => item.boeId === boeId);
    if (cached) {
      setSearchId(boeId);
      setState(prev => ({ ...prev, loading: false, error: null, result: cached.audit }));
      return;
    }

    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }

    setSearchId(boeId);
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
        xmlText = `<boe><diario id="BOE-S-2024"><titulo>BOE</titulo><item id="${boeId}"><titulo>${docTitle}</titulo><texto>Contenido simulado para auditoría...</texto></item></diario></boe>`;
      }

      const audit = await analyzeBOE(xmlText, lang);
      await saveAuditToDB(boeId, docTitle, audit);
      await loadHistory();

      setState(prev => ({ ...prev, loading: false, error: null, result: audit }));

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
    setState({ loading: false, error: null, result: null, scrapingResults: undefined, isScraping: false });
    setSearchId('');
  };



  const getCurrentView = () => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/history') return 'history';
    if (location.pathname.startsWith('/audit/')) return 'audit';
    return 'home';
  };

  const isAlreadyAudited = (id: string) => history.some(h => h.boeId === id);

  const LoginOverlay = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl text-center space-y-8 relative animate-in zoom-in duration-300">
        <button
          onClick={() => setShowLogin(false)}
          className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/10 rounded-3xl border border-blue-600/20 text-blue-500 mb-2 rotate-3">
          <Lock size={40} />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white">{t.loginTitle}</h2>
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
                autoFocus
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
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <GoogleAnalytics />
      <Navbar
        currentView={getCurrentView()}
        resetState={resetState}
        lang={lang}
        toggleLang={toggleLang}
        isLoggedIn={isLoggedIn}
        handleLogout={handleLogout}
        setShowLogin={setShowLogin}
        t={t}
      />

      <div className="max-w-7xl mx-auto px-4 pt-4 pb-16 md:pt-4 md:pb-24 mt-20 md:mt-24">

        <header className="mb-12 text-center relative">
          <div className="absolute top-0 right-0 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 text-[10px] font-bold">
            <div className={`w-2 h-2 rounded-full ${window.GA_INITIALIZED ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
            <span className={window.GA_INITIALIZED ? 'text-emerald-400' : 'text-slate-500'}>
              {window.GA_INITIALIZED ? t.gaStatusActive : t.gaStatusInactive}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 bg-blue-900/30 px-4 py-2 rounded-full border border-blue-500/30 text-blue-400 mb-6">
            <User size={16} /><span className="text-sm font-bold tracking-widest uppercase">Agent #0412 · {t.badge}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-white via-slate-400 to-slate-600 bg-clip-text text-transparent">{t.title}</h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">{t.subtitle}</p>
        </header>

        <Routes>
          <Route path="/" element={
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchLatestBOE()}
                        disabled={isFetchingLatest}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center gap-2 text-xs font-bold border border-slate-700 disabled:opacity-50"
                        title={t.refreshBtn}
                      >
                        <Radio size={14} className={isFetchingLatest ? 'animate-pulse' : ''} />
                        {t.refreshBtn}
                      </button>
                      {isFetchingLatest && <Loader2 className="animate-spin text-slate-500" size={20} />}
                    </div>
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
                            <a 
                              href={`https://www.boe.es/buscar/doc.php?id=${art.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] text-slate-600 font-mono hover:text-blue-400 transition-colors flex items-center gap-1"
                            >
                              {art.id} <ExternalLink size={10} />
                            </a>
                            {(isLoggedIn || audited) && (
                              <Link
                                to={`/audit/${art.id}`}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${audited ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 hover:bg-emerald-600 hover:text-white' : 'bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600 hover:text-white'}`}
                              >
                                <Zap size={10} />
                                {audited ? t.goToAudit : t.auditWithGemini}
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-8 flex flex-col">
                  <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-3xl shadow-2xl flex-1 flex flex-col justify-center gap-8">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-600/10 rounded-2xl border border-blue-600/20 flex items-center justify-center mx-auto text-blue-500 shadow-xl shadow-blue-900/10">
                        <Search size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">Búsqueda Inteligente</h3>
                      <p className="text-slate-500 text-sm max-w-xs mx-auto">Introduce el identificador del BOE para realizar una auditoría instantánea.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 outline-none text-white text-lg focus:border-blue-500 transition-all font-mono placeholder:text-slate-700"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchId && handleAudit(searchId)}
                      />
                      <button
                        onClick={() => handleAudit(searchId)}
                        disabled={!searchId}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-2xl font-black text-xl transition-all transform active:scale-[0.98] shadow-2xl shadow-blue-900/20"
                      >
                        {t.analyzeBtn}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          } />

          <Route path="/history" element={
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black flex items-center gap-3 text-white">
                    <History className="text-purple-500" size={32} />
                    {t.historyTitle}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">{t.historySubtitle}</p>
                </div>
                {history.length > 0 && (
                  <span className="bg-purple-950/40 text-purple-400 px-4 py-1.5 rounded-full text-xs font-bold border border-purple-900/50">
                    {history.length} Auditorías
                  </span>
                )}
              </div>

              <div className="bg-slate-900/20 border border-slate-800 rounded-3xl min-h-[500px]">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-600 opacity-40 italic text-sm">
                    <Database size={64} className="mb-6" />
                    No hay auditorías procesadas aún
                  </div>
                ) : (
                  <HistoryDashboard
                    history={history}
                    onClear={handleClearHistory}
                    onImport={handleImportData}
                    lang={lang}
                    isLoggedIn={isLoggedIn}
                  />
                )}
              </div>
            </div>
          } />

          <Route path="/audit/:boeId" element={
            <AuditTrigger
              performAudit={performAudit}
              state={state}
              t={t}
              isLoggedIn={isLoggedIn}
              searchId={searchId}
              lang={lang}
              resetState={resetState}
              history={history}
            />
          } />
        </Routes>



        <footer className="mt-24 pt-12 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p>&copy; 2024 Civic Intelligence Auditor. {t.footerDesc}</p>
        </footer>
        {showLogin && <LoginOverlay />}
      </div>
    </div>
  );
};

export default App;
