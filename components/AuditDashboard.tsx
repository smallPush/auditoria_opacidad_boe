import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import { BOEAuditResponse, AuditHistoryItem } from "../types";
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Download,
  Loader2,
  Twitter,
  Copy,
  Check,
  FileJson,
  MapPin,
  Tag,
  Send,
  Share2,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { translations, Language } from "../translations";
import { postTweet } from "../services/twitterService";
import { saveAuditToDB } from "../services/supabaseService";

interface Props {
  data: BOEAuditResponse;
  boeId: string;
  title: string;
  lang: Language;
  isLoggedIn?: boolean;
  history?: AuditHistoryItem[];
  onSelectAudit?: (boeId: string) => void;
}

const CustomTooltip = ({
  active,
  payload,
  lang,
}: TooltipProps<number, string> & { lang: Language }) => {
  if (active && payload && payload.length) {
    const t = translations[lang];
    const data =
      payload && Array.isArray(payload) && payload.length > 0
        ? payload[0]
        : null;
    if (!data) return null;
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
  title,
  lang,
  isLoggedIn,
  history,
  onSelectAudit,
}) => {
  const t = translations[lang];
  const [copiedTweet, setCopiedTweet] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedDirectLink, setCopiedDirectLink] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(`boe_vote_${boeId}`)
        : null;
    } catch {
      return null;
    }
  });
  const [isPostingTweet, setIsPostingTweet] = useState(false);
  const [tweetSent, setTweetSent] = useState(data.tweet_sent || false);

  useEffect(() => {
    setTweetSent(data.tweet_sent || false);
  }, [data.tweet_sent]);

  useEffect(() => {
    try {
      const savedVote =
        typeof window !== "undefined" && window.localStorage
          ? window.localStorage.getItem(`boe_vote_${boeId}`)
          : null;
      setFeedbackGiven(savedVote);
    } catch {
      setFeedbackGiven(null);
    }
  }, [boeId]);

  const relatedAudits = React.useMemo(() => {
    if (!history || history.length === 0) return [];
    const valid = history.filter(
      (h) =>
        h &&
        h.boeId !== boeId &&
        h.audit &&
        typeof h.audit.nivel_transparencia === "number"
    );
    return [...valid]
      .sort((a, b) => {
        const aMatch =
          (data.comunidad_autonoma &&
            a.audit.comunidad_autonoma === data.comunidad_autonoma) ||
          (data.tipologia && a.audit.tipologia === data.tipologia);
        const bMatch =
          (data.comunidad_autonoma &&
            b.audit.comunidad_autonoma === data.comunidad_autonoma) ||
          (data.tipologia && b.audit.tipologia === data.tipologia);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return (
          (a.audit.nivel_transparencia ?? 100) -
          (b.audit.nivel_transparencia ?? 100)
        );
      })
      .slice(0, 3);
  }, [history, boeId, data.comunidad_autonoma, data.tipologia]);

  const chartData = [
    { name: t.transparencyLevel, value: data.nivel_transparencia },
    { name: t.opacityLevel, value: 100 - data.nivel_transparencia },
  ];

  const COLORS = ["#22c55e", "#ef4444"];
  const boeUrl = `https://www.boe.es/buscar/doc.php?id=${boeId}`;
  const radarUrl = `https://radarboe.es/audit/${boeId}`;

  const safeCopy = async (text: string): Promise<boolean> => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback
    }
    try {
      if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
      }
    } catch {
      // Ignore
    }
    return false;
  };

  const handleCopyDirectLink = () => {
    safeCopy(radarUrl);
    setCopiedDirectLink(true);
    setTimeout(() => setCopiedDirectLink(false), 2000);
  };

  const handleShareNative = async () => {
    const shareData = {
      title: `Auditoría BOE: ${title}`,
      text: `${data.resumen_ciudadano.substring(0, 140)}...`,
      url: radarUrl,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // cancelled
      }
    } else {
      handleCopyDirectLink();
    }
  };

  const handleFeedback = (type: string) => {
    setFeedbackGiven(type);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(`boe_vote_${boeId}`, type);
      }
    } catch {
      // ignore
    }
  };

  const handleCopyTweet = () => {
    safeCopy(`${data.resumen_tweet}\n\n${radarUrl}`);
    setCopiedTweet(true);
    setTimeout(() => setCopiedTweet(false), 2000);
  };

  const handlePostTweet = async () => {
    if (tweetSent) return;
    setIsPostingTweet(true);
    try {
      await postTweet(data, radarUrl);
      const updatedData = { ...data, tweet_sent: true };
      await saveAuditToDB(boeId, title, updatedData);
      setTweetSent(true);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert("Error posting tweet: " + errorMessage);
    } finally {
      setIsPostingTweet(false);
    }
  };

  const handleCopyJson = () => {
    safeCopy(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const jsonString = JSON.stringify(
      {
        boe_id: boeId,
        timestamp: new Date().toISOString(),
        report: data,
      },
      null,
      2,
    );
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Audit_${boeId}_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="text-emerald-400" />
              {t.transparencyLevel}
            </h3>
            <span
              className={`text-4xl font-black ${data.nivel_transparencia <= 33 ? "text-red-400" : data.nivel_transparencia < 70 ? "text-amber-400" : "text-emerald-400"}`}
            >
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
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => <CustomTooltip {...props} lang={lang} />}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-slate-400 text-sm mt-4 italic">
            {t.transparencyDesc}
          </p>
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
            <span className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-400 font-mono">
              ID: {boeId}
            </span>
            <span className="bg-emerald-950/40 text-emerald-400 px-3 py-1 rounded-full text-xs border border-emerald-900/50">
              Gemini 3 Flash
            </span>
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
              let style =
                "bg-emerald-950/40 text-emerald-400 border-emerald-900/50";

              if (val <= 33) {
                label = t.transparencyVeryBad;
                style = "bg-red-950/40 text-red-400 border-red-900/50";
              } else if (val < 70) {
                label = t.transparencyBad;
                style = "bg-amber-950/40 text-amber-400 border-amber-900/50";
              }

              return (
                <span
                  className={`${style} px-3 py-1 rounded-full text-xs border flex items-center gap-1`}
                >
                  {label}
                </span>
              );
            })()}
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
              <li
                key={idx}
                className="flex gap-3 items-start bg-red-950/20 border border-red-900/30 p-3 rounded-lg"
              >
                <span className="text-red-500 mt-1">•</span>
                <span className="text-slate-300 text-sm">{flag}</span>
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
              <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2 text-sm">
                <CheckCircle size={14} /> {t.winners}
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.vencedores_vencidos.ganadores.map((g, idx) => (
                  <span
                    key={idx}
                    className="bg-emerald-900/30 text-emerald-100 px-3 py-1 rounded-lg border border-emerald-800/50 text-xs"
                  >
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
                  <span
                    key={idx}
                    className="bg-red-900/30 text-red-100 px-3 py-1 rounded-lg border border-red-800/50 text-xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`${isLoggedIn ? "lg:col-span-2" : "lg:col-span-3"} bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl`}
        >
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
                {copiedJson ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Copy size={14} />
                )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citizen Feedback Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              {t.citizenFeedback}
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              {t.citizenFeedbackPrompt}
            </p>
          </div>
          {feedbackGiven ? (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
              <span>{t.feedbackThanks}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleFeedback("clear")}
                className="py-3 px-2 rounded-xl font-bold text-xs bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 transition-all flex flex-col items-center gap-1 text-center"
              >
                <ThumbsUp size={16} />
                <span>{t.feedbackClear}</span>
              </button>
              <button
                onClick={() => handleFeedback("confusing")}
                className="py-3 px-2 rounded-xl font-bold text-xs bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-800/40 transition-all flex flex-col items-center gap-1 text-center"
              >
                <AlertTriangle size={16} />
                <span>{t.feedbackConfusing}</span>
              </button>
              <button
                onClick={() => handleFeedback("alarming")}
                className="py-3 px-2 rounded-xl font-bold text-xs bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-800/40 transition-all flex flex-col items-center gap-1 text-center"
              >
                <ThumbsDown size={16} />
                <span>{t.feedbackAlarming}</span>
              </button>
            </div>
          )}
        </div>

        {/* Social Sharing & Spread */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold flex items-center gap-2 text-white">
              <Share2 size={18} className="text-blue-400" />
              {t.shareTitle}
            </h4>
            <button
              onClick={handleCopyDirectLink}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-950/30 border border-blue-900/50 py-1.5 px-3 rounded-lg transition-all"
            >
              {copiedDirectLink ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} />
              )}
              {copiedDirectLink ? t.linkCopied : t.copyDirectLink}
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 leading-relaxed italic">
            "{data.resumen_tweet}
            <br />
            <br />
            {radarUrl}"
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* WhatsApp */}
            <button
              onClick={() => {
                const text = `🔍 *Auditoría Radar BOE* (${data.nivel_transparencia}% de transparencia)\n\n_${data.resumen_ciudadano.substring(0, 140)}..._\n\n👉 ${radarUrl}`;
                window.open(
                  `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
                  "_blank",
                );
              }}
              className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
            >
              <MessageCircle size={14} />
              {t.shareWhatsApp}
            </button>

            {/* Telegram */}
            <button
              onClick={() => {
                const text = `🔍 Auditoría Radar BOE: ${title} (${data.nivel_transparencia}% transparencia)`;
                window.open(
                  `https://t.me/share/url?url=${encodeURIComponent(radarUrl)}&text=${encodeURIComponent(text)}`,
                  "_blank",
                );
              }}
              className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 transition-all"
            >
              <Send size={14} />
              {t.shareTelegram}
            </button>

            {/* Twitter / X */}
            <button
              onClick={() => {
                const tweetText = `${data.resumen_tweet}\n\n${radarUrl}`;
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
                  "_blank",
                );
              }}
              className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all"
            >
              <Twitter size={14} />
              X
            </button>

            {/* Native / Share */}
            <button
              onClick={handleShareNative}
              className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all"
            >
              <Share2 size={14} />
              {t.shareNative}
            </button>
          </div>

          {isLoggedIn && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handlePostTweet}
                disabled={tweetSent || isPostingTweet}
                className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${tweetSent ? "bg-emerald-900/30 text-emerald-400 cursor-not-allowed border border-emerald-900/50" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"}`}
              >
                {isPostingTweet ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : tweetSent ? (
                  <Check size={14} />
                ) : (
                  <Send size={14} />
                )}
                {tweetSent ? t.tweetSent : t.postTweet}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Related / Recommended Critical Audits */}
      {relatedAudits.length > 0 && (
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-400" />
              {t.relatedAudits}
            </h3>
            <p className="text-slate-400 text-xs">
              {t.relatedAuditsDesc}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedAudits.map((item) => (
              <a
                key={item.boeId}
                href={`/audit/${item.boeId}`}
                onClick={(e) => {
                  if (onSelectAudit) {
                    e.preventDefault();
                    onSelectAudit(item.boeId);
                  }
                }}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl text-left transition-all flex flex-col justify-between group block"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] text-slate-500">
                      {item.boeId}
                    </span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        item.audit.nivel_transparencia <= 33
                          ? "bg-red-950/40 text-red-400 border border-red-900/40"
                          : item.audit.nivel_transparencia < 70
                          ? "bg-amber-950/40 text-amber-400 border border-amber-900/40"
                          : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40"
                      }`}
                    >
                      {item.audit.nivel_transparencia}%
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 line-clamp-2 group-hover:text-white mb-2">
                    {item.title}
                  </h4>
                </div>
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-3">
                  {t.viewAudit} <ArrowRight size={12} />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AuditDashboard;
