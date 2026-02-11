import React, { useState, useEffect } from 'react';

interface CookieConsentProps {
  t: any;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ t }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (consent === null) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg font-bold text-white">{t.cookieTitle}</h3>
            <p className="text-slate-400 text-sm">{t.cookieText}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <button
                onClick={handleReject}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all border border-slate-700"
            >
                {t.cookieReject}
            </button>
            <button
                onClick={handleAccept}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-900/20"
            >
                {t.cookieAccept}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
