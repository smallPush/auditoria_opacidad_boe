
export interface BOEAuditIndexItem {
  id: string;
  titulo: string;
  url_boe: string;
  transparencia: number;
  fecha_auditoria: string;
}

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
  comunidad_autonoma?: string;
  tipologia?: string;
  tweet_sent?: boolean;
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
}

export type ImportDataPayload =
  | AuditHistoryItem[]
  | { boe_id: string; title?: string; report: BOEAuditResponse }
  | { boeId: string; title?: string; audit: BOEAuditResponse };
