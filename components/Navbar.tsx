import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, History, Globe, LogOut, ShieldCheck, Menu, X, User, Box, Share2 } from 'lucide-react';
import { Language } from '../translations';

interface NavbarProps {
    resetState: () => void;
    lang: Language;
    toggleLang: () => void;
    isLoggedIn: boolean;
    userApiKey?: string;
    handleLogout: () => void;
    setShowLogin: (show: boolean) => void;
    t: any;
    currentView: 'home' | 'history' | 'audit' | 'tags' | 'related-tags';
}

const Navbar: React.FC<NavbarProps> = ({
    resetState,
    lang,
    toggleLang,
    isLoggedIn,
    userApiKey,
    handleLogout,
    setShowLogin,
    t,
    currentView
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleNavClick = (path: string) => {
        navigate(path);
        resetState();
        setIsMenuOpen(false);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo & Badge */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleNavClick('/')}>
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="text-white" size={24} />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-black text-white leading-none">Civic Auditor</h1>
                                <p className="text-[10px] font-bold text-blue-400 tracking-tighter uppercase">Agent #0412</p>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => handleNavClick('/')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentView === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Zap size={16} />
                            {t.home}
                        </button>
                        <button
                            onClick={() => handleNavClick('/history')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentView === 'history' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <History size={16} />
                            {t.historyMenu}
                        </button>

                        <button
                            onClick={() => handleNavClick('/related-tags')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${currentView === 'related-tags' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Share2 size={16} />
                            {t.networkMenu}
                        </button>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={toggleLang}
                            className="bg-slate-900 border border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all text-blue-400"
                            title={lang.toUpperCase()}
                        >
                            <Globe size={18} />
                        </button>

                        {userApiKey && !isLoggedIn && (
                            <div className="bg-emerald-900/20 border border-emerald-900/30 px-3 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                                <Box size={14} />
                                <span>CUSTOM API KEY</span>
                            </div>
                        )}

                        {isLoggedIn || userApiKey ? (
                            <button
                                onClick={handleLogout}
                                className="bg-red-900/10 border border-red-900/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-red-900/20 transition-all text-sm font-bold text-red-400"
                            >
                                <LogOut size={16} />
                                <span className="hidden lg:inline">{t.logoutBtn}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowLogin(true)}
                                className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl flex items-center gap-2 transition-all text-sm font-bold text-white shadow-lg shadow-blue-900/20"
                            >
                                <ShieldCheck size={16} />
                                {t.loginTitle}
                            </button>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center gap-2">
                        <button
                            onClick={toggleLang}
                            className="bg-slate-900 border border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center text-blue-400"
                        >
                            <span className="text-xs font-black">{lang.toUpperCase()}</span>
                        </button>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-slate-950 border-b border-slate-800 animate-in slide-in-from-top duration-300">
                    <div className="px-4 pt-2 pb-6 space-y-3">
                        <button
                            onClick={() => handleNavClick('/')}
                            className={`w-full p-4 rounded-2xl text-left font-bold flex items-center gap-3 ${currentView === 'home' ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-400'}`}
                        >
                            <Zap size={20} />
                            {t.home}
                        </button>
                        <button
                            onClick={() => handleNavClick('/history')}
                            className={`w-full p-4 rounded-2xl text-left font-bold flex items-center gap-3 ${currentView === 'history' ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20' : 'text-slate-400'}`}
                        >
                            <History size={20} />
                            {t.historyMenu}
                        </button>

                        <button
                            onClick={() => handleNavClick('/related-tags')}
                            className={`w-full p-4 rounded-2xl text-left font-bold flex items-center gap-3 ${currentView === 'related-tags' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-400'}`}
                        >
                            <Share2 size={20} />
                            {t.networkMenuMobile}
                        </button>

                        <div className="pt-4 border-t border-slate-800/50 space-y-3">
                            {userApiKey && !isLoggedIn && (
                                <div className="w-full p-4 rounded-2xl text-left font-bold flex items-center gap-3 text-emerald-400 bg-emerald-900/10 border border-emerald-900/20">
                                    <Box size={20} />
                                    <span>CUSTOM API KEY ACTIVE</span>
                                </div>
                            )}

                            {isLoggedIn || userApiKey ? (
                                <button
                                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                                    className="w-full p-4 rounded-2xl text-left font-bold flex items-center gap-3 text-red-400 bg-red-900/10"
                                >
                                    <LogOut size={20} />
                                    {t.logoutBtn}
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setShowLogin(true); setIsMenuOpen(false); }}
                                    className="w-full p-4 rounded-2xl text-left font-bold flex items-center gap-3 text-white bg-blue-600 shadow-xl shadow-blue-900/20"
                                >
                                    <ShieldCheck size={20} />
                                    {t.loginTitle}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
