import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { AnalysisState, BOEAuditResponse, AuditHistoryItem } from '../types';
import { Language } from '../translations';
import AuditDashboard from './AuditDashboard';

interface AuditTriggerProps {
  performAudit: (boeId: string) => void;
  state: AnalysisState;
  t: any;
  isLoggedIn: boolean;
  searchId: string;
  lang: Language;
  onGenerateThumbnail: (audit: BOEAuditResponse) => void;
  onGenerateVideo: (audit: BOEAuditResponse) => void;
  resetState: () => void;
  history: AuditHistoryItem[];
}

const AuditTrigger: React.FC<AuditTriggerProps> = ({
  performAudit,
  state,
  t,
  isLoggedIn,
  searchId,
  lang,
  onGenerateThumbnail,
  onGenerateVideo,
  resetState,
  history
}) => {
  const { boeId } = useParams<{ boeId: string }>();
  const navigate = useNavigate();

  const currentItem = history.find(h => h.boeId === (boeId || searchId));
  const title = currentItem?.title || boeId || "BOE Document";

  useEffect(() => {
    if (boeId) {
      performAudit(boeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boeId, isLoggedIn]);

  if (state.error) {
    return (
      <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-3xl flex flex-col items-center gap-4 text-red-200 mt-8">
        <AlertCircle className="text-red-500" size={64} />
        <h3 className="font-bold text-2xl">{t.errorTitle}</h3>
        <p className="text-slate-400">{state.error}</p>
        <button 
          onClick={() => boeId && performAudit(boeId)} 
          className="bg-slate-800 hover:bg-slate-700 px-10 py-3 rounded-xl font-bold"
        >
          {t.retryBtn}
        </button>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{t.decodingOpacity}</h2>
          <p className="text-slate-400 max-w-md mx-auto">{t.processingGemini}</p>
        </div>
      </div>
    );
  }

  if (state.result) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl text-slate-300 hover:bg-slate-800 transition-all"
        >
          <ArrowLeft size={18} /> {t.backToHome}
        </button>
        <AuditDashboard
          data={state.result}
          boeId={searchId}
          title={title}
          lang={lang}
          thumbnailUrl={state.thumbnailUrl}
          isGeneratingThumbnail={state.isGeneratingThumbnail}
          onGenerateThumbnail={() => state.result && onGenerateThumbnail(state.result)}
          videoUrl={state.videoUrl}
          isGeneratingVideo={state.isGeneratingVideo}
          onGenerateVideo={() => state.result && onGenerateVideo(state.result)}
          isLoggedIn={isLoggedIn}
        />
      </div>
    );
  }

  return null;
};

export default AuditTrigger;
