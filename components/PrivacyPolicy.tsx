import React from 'react';
import { Shield, Lock, Eye, Database, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PrivacyPolicyProps {
  t: any;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ t }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        {t.backToHome}
      </button>

      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl border border-blue-600/20 flex items-center justify-center text-blue-500">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">{t.privacyTitle}</h1>
        </div>

        <p className="text-slate-400 text-lg mb-12 leading-relaxed">
          {t.privacyIntro}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4 p-6 rounded-2xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-3 text-blue-400 mb-2">
              <Eye size={24} />
              <h2 className="text-xl font-bold">{t.cookieTitle}</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t.privacyCookies}
            </p>
          </div>

          <div className="space-y-4 p-6 rounded-2xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center gap-3 text-emerald-400 mb-2">
              <Database size={24} />
              <h2 className="text-xl font-bold">Datos Personales</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t.privacyData}
            </p>
          </div>

          <div className="space-y-4 p-6 rounded-2xl bg-slate-950/50 border border-slate-800 md:col-span-2">
            <div className="flex items-center gap-3 text-purple-400 mb-2">
              <Lock size={24} />
              <h2 className="text-xl font-bold">Derechos</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t.privacyRights}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-slate-500 text-xs text-center">
          Última actualización: Febrero 2026 • Auditoría Ciudadana del BOE
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
