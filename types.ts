
export interface BOEArticle {
  id: string;
  title: string;
  url: string;
  category: string;
}

export interface BOEAuditResponse {
  nivel_transparencia: number;
  analisis_critico: string;
  resumen_ciudadano: string;
  resumen_tweet: string;
  banderas_rojas: string[];
  vencedores_vencidos: {
    ganadores: string[];
    perdedores: string[];
  };
}

export interface ScrapedLaw {
  id: string;
  titulo: string;
  departamento: string;
  seccion: string;
}

export interface AuditHistoryItem {
  boeId: string;
  timestamp: number;
  title: string;
  audit: BOEAuditResponse;
}

export interface AnalysisState {
  loading: boolean;
  error: string | null;
  result: BOEAuditResponse | null;
  rawXml?: string;
  scrapingResults?: ScrapedLaw[];
  isScraping?: boolean;
  thumbnailUrl?: string;
  isGeneratingThumbnail?: boolean;
  videoUrl?: string;
  isGeneratingVideo?: boolean;
}
