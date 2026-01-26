
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import { BOEAuditResponse } from '../types';
import { AlertTriangle, Info, CheckCircle, XCircle, TrendingUp, TrendingDown, ExternalLink, Image as ImageIcon, Zap, Download, Loader2, Twitter, Copy, Check, Video, Play, FileJson, Terminal, MapPin, Tag } from 'lucide-react';
import { translations, Language } from '../translations';

interface Props {
  data: BOEAuditResponse;
  boeId: string;
  lang: Language;
  thumbnailUrl?: string;
  isGeneratingThumbnail?: boolean;
  onGenerateThumbnail: () => void;
  videoUrl?: string;
  isGeneratingVideo?: boolean;
  onGenerateVideo: () => void;
  isLoggedIn?: boolean;
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

const AuditDashboard: React.FC<Props> = ({
  data,
  boeId,
  lang,
  thumbnailUrl,
  isGeneratingThumbnail,
  onGenerateThumbnail,
  videoUrl,
  isGeneratingVideo,
  onGenerateVideo,
  isLoggedIn
}) => {
  const t = translations[lang];
  const [copiedTweet, setCopiedTweet] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [videoPhase, setVideoPhase] = useState(1);

  useEffect(() => {
    let interval: any;
    if (isGeneratingVideo) {
      interval = setInterval(() => {
        setVideoPhase(p => p < 3 ? p + 1 : 1);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isGeneratingVideo]);

  const chartData = [
    { name: t.transparencyLevel, value: data.nivel_transparencia },
    { name: t.opacityLevel, value: 100 - data.nivel_transparencia },
  ];

  const COLORS = ['#22c55e', '#ef4444'];
  const boeUrl = `https://www.boe.es/buscar/doc.php?id=${boeId}`;

  const handleCopyTweet = () => {
    navigator.clipboard.writeText(data.resumen_tweet);
    setCopiedTweet(true);
    setTimeout(() => setCopiedTweet(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const jsonString = JSON.stringify({
      boe_id: boeId,
      timestamp: new Date().toISOString(),
      report: data
    }, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_${boeId}_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const videoLoadingText = videoPhase === 1 ? t.loadingVideoPhase1 : videoPhase === 2 ? t.loadingVideoPhase2 : t.loadingVideoPhase3;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="text-emerald-400" />
              {t.transparencyLevel}
            </h3>
            <span className={`text-4xl font-black ${data.nivel_transparencia <= 33 ? 'text-red-400' : data.nivel_transparencia < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
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

        <div className="flex-[1.5] bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Info className="text-blue-400" />
              {t.citizenSummary}
            </h3>
            <div className="flex gap-2">
              <a
                href={boeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-slate-700 hover:border-blue-500/50"
              >
                <ExternalLink size={14} />
                {t.viewOfficial}
              </a>
            </div>
          </div>
          <div className="text-slate-200 leading-relaxed text-lg flex-1">
            {data.resumen_ciudadano}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-400 font-mono">ID: {boeId}</span>
            <span className="bg-emerald-950/40 text-emerald-400 px-3 py-1 rounded-full text-xs border border-emerald-900/50">Gemini 3 Flash</span>
            {data.comunidad_autonoma && (
              <span className="bg-blue-950/40 text-blue-400 px-3 py-1 rounded-full text-xs border border-blue-900/50 flex items-center gap-1">
                <MapPin size={10} />
                {data.comunidad_autonoma}
              </span>
            )}
            {data.tipologia && (
              <span className="bg-purple-950/40 text-purple-400 px-3 py-1 rounded-full text-xs border border-purple-900/50 flex items-center gap-1">
                <Tag size={10} />
                {data.tipologia}
              </span>
            )}
            {(() => {
              const val = data.nivel_transparencia;
              let label = t.transparencyAcceptable;
              let style = "bg-emerald-950/40 text-emerald-400 border-emerald-900/50";

              if (val <= 33) {
                label = t.transparencyVeryBad;
                style = "bg-red-950/40 text-red-400 border-red-900/50";
              } else if (val < 70) {
                label = t.transparencyBad;
                style = "bg-amber-950/40 text-amber-400 border-amber-900/50";
              }

              return (
                <span className={`${style} px-3 py-1 rounded-full text-xs border flex items-center gap-1`}>
                  {label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-1">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-400">
            <AlertTriangle />
            {t.redFlags}
          </h3>
          <ul className="space-y-3">
            {data.banderas_rojas.map((flag, idx) => (
              <li key={idx} className="flex gap-3 items-start bg-red-950/20 border border-red-900/30 p-3 rounded-lg">
                <span className="text-red-500 mt-1">•</span>
                <span className="text-slate-300 text-sm">{flag}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-1">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
            <TrendingUp className="text-purple-400" />
            {t.impactBalance}
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2 text-sm">
                <CheckCircle size={14} /> {t.winners}
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.vencedores_vencidos.ganadores.map((g, idx) => (
                  <span key={idx} className="bg-emerald-900/30 text-emerald-100 px-3 py-1 rounded-lg border border-emerald-800/50 text-xs">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2 text-sm">
                <XCircle size={14} /> {t.losers}
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.vencedores_vencidos.perdedores.map((p, idx) => (
                  <span key={idx} className="bg-red-900/30 text-red-100 px-3 py-1 rounded-lg border border-red-800/50 text-xs">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-blue-400">
                <ImageIcon size={14} />
                {t.diffusionTools}
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative aspect-[9/16] min-h-[200px]">
                {thumbnailUrl ? (
                  <>
                    <img src={thumbnailUrl} alt="Thumbnail Reel" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end justify-center p-3">
                      <a href={thumbnailUrl} download className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg"><Download size={14} /></a>
                    </div>
                  </>
                ) : isGeneratingThumbnail ? (
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                ) : (
                  <button onClick={onGenerateThumbnail} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-full"><Zap size={24} /></button>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-2 text-red-400">
                <Video size={14} />
                {t.videoSummaryTitle}
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative aspect-[9/16] min-h-[200px]">
                {videoUrl ? (
                  <video src={videoUrl} controls className="w-full h-full object-cover" />
                ) : isGeneratingVideo ? (
                  <div className="flex flex-col items-center gap-3 p-4 text-center">
                    <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] text-red-400 font-mono animate-pulse">{videoLoadingText}</span>
                  </div>
                ) : (
                  <button onClick={onGenerateVideo} className="bg-red-600 hover:bg-red-500 text-white p-4 rounded-full transition-all hover:scale-110"><Play size={24} /></button>
                )}
              </div>
              <p className="text-[9px] text-slate-500 mt-2 text-center">{t.videoDesc}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${isLoggedIn ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl`}>
          <h3 className="text-2xl font-bold mb-6 border-b border-slate-800 pb-4 flex items-center gap-3">
            <TrendingDown className="text-amber-400" />
            {t.criticalAnalysis}
          </h3>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1">
            {data.analisis_critico}
          </p>
        </div>

        {isLoggedIn && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-400">
              <FileJson size={20} />
              {t.jsonExportTitle}
            </h3>
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-[10px] overflow-auto max-h-[300px] custom-scrollbar text-emerald-500/80 mb-4 flex-1">
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyJson}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs transition-all"
              >
                {copiedJson ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {t.copyJson}
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs transition-all"
              >
                <Download size={14} />
                {t.downloadJson}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold flex items-center gap-2 text-slate-300">
            <Twitter size={14} className="text-blue-400" />
            {t.tweetSummaryTitle}
          </h4>
          <button onClick={handleCopyTweet} className="text-slate-500 hover:text-white transition-colors">
            {copiedTweet ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 leading-relaxed italic">
          "{data.resumen_tweet}"
        </div>
      </div>
    </div>
  );
};

export default AuditDashboard;
