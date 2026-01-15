
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import { BOEAuditResponse } from '../types';
import { AlertTriangle, Info, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { translations, Language } from '../translations';

interface Props {
  data: BOEAuditResponse;
  boeId: string;
  lang: Language;
}

const CustomTooltip = ({ active, payload, lang }: TooltipProps<number, string> & { lang: Language }) => {
  if (active && payload && payload.length) {
    const t = translations[lang];
    const data = payload[0];
    const isTransparency = data.name === t.transparencyLevel;
    
    return (
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-2xl max-w-[200px]">
        <p className="text-sm font-bold mb-1" style={{ color: data.fill }}>
          {data.name}: {data.value}%
        </p>
        <p className="text-[10px] text-slate-400 leading-tight">
          {isTransparency ? t.transparencyTooltip : t.opacityTooltip}
        </p>
      </div>
    );
  }
  return null;
};

const AuditDashboard: React.FC<Props> = ({ data, boeId, lang }) => {
  const t = translations[lang];
  const chartData = [
    { name: t.transparencyLevel, value: data.nivel_transparencia },
    { name: t.opacityLevel, value: 100 - data.nivel_transparencia },
  ];

  const COLORS = ['#22c55e', '#ef4444'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="text-emerald-400" />
              {t.transparencyLevel}
            </h3>
            <span className={`text-4xl font-black ${data.nivel_transparencia > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {data.nivel_transparencia}%
            </span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <CustomTooltip {...props} lang={lang} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-slate-400 text-sm mt-4 italic">{t.transparencyDesc}</p>
        </div>

        <div className="flex-[1.5] bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Info className="text-blue-400" />
            {t.citizenSummary}
          </h3>
          <div className="text-slate-200 leading-relaxed text-lg">
            {data.resumen_ciudadano}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
             <span className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-400 font-mono">ID: {boeId}</span>
             <span className="bg-emerald-950/40 text-emerald-400 px-3 py-1 rounded-full text-xs border border-emerald-900/50">Gemini 3 Flash</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-400">
            <AlertTriangle />
            {t.redFlags}
          </h3>
          <ul className="space-y-3">
            {data.banderas_rojas.map((flag, idx) => (
              <li key={idx} className="flex gap-3 items-start bg-red-950/20 border border-red-900/30 p-3 rounded-lg">
                <span className="text-red-500 mt-1">•</span>
                <span className="text-slate-300">{flag}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
             <TrendingUp className="text-purple-400" />
             {t.impactBalance}
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                <CheckCircle size={16} /> {t.winners}
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.vencedores_vencidos.ganadores.map((g, idx) => (
                  <span key={idx} className="bg-emerald-900/30 text-emerald-100 px-3 py-1 rounded-lg border border-emerald-800/50 text-sm">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <XCircle size={16} /> {t.losers}
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.vencedores_vencidos.perdedores.map((p, idx) => (
                  <span key={idx} className="bg-red-900/30 text-red-100 px-3 py-1 rounded-lg border border-red-800/50 text-sm">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <h3 className="text-2xl font-bold mb-6 border-b border-slate-800 pb-4 flex items-center gap-3">
          <TrendingDown className="text-amber-400" />
          {t.criticalAnalysis}
        </h3>
        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1">
          {data.analisis_critico}
        </p>
      </div>
    </div>
  );
};

export default AuditDashboard;
