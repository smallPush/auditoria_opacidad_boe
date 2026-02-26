
import { BOEArticle } from './types';

// This simulates the JSON file with URLs to search for BOE articles
export const BOE_SOURCES: BOEArticle[] = [
  {
    id: "BOE-A-2024-4161",
    title: "Ley de Presupuestos Generales del Estado para el ejercicio 2024",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-4161",
    category: "Economía"
  },
  {
    id: "BOE-A-2024-5012",
    title: "Reforma urgente del Mercado de Trabajo y fomento de la contratación indefinida",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-5012",
    category: "Social"
  },
  {
    id: "BOE-A-2024-6123",
    title: "Regulación de Vivienda Pública y medidas contra el desahucio",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-6123",
    category: "Vivienda"
  },
  {
    id: "BOE-A-2024-7788",
    title: "Subvenciones directas a la Innovación Digital en PYMES",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-7788",
    category: "Tecnología"
  },
  {
    id: "BOE-A-2024-8901",
    title: "Modificación de la Ley de Montes y gestión forestal sostenible",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-8901",
    category: "Medio Ambiente"
  },
  {
    id: "BOE-A-2024-9122",
    title: "Protocolo de actuación contra la sequía en la cuenca del Ebro",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-9122",
    category: "Recursos Naturales"
  },
  {
    id: "BOE-A-2024-1055",
    title: "Plan de fomento de la Inteligencia Artificial en la Administración Pública",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-1055",
    category: "Innovación"
  },
  {
    id: "BOE-A-2024-1122",
    title: "Ayudas extraordinarias al sector del transporte por carretera",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-1122",
    category: "Transportes"
  },
  {
    id: "BOE-A-2024-2233",
    title: "Regulación del teletrabajo en las Fuerzas y Cuerpos de Seguridad",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-2233",
    category: "Interior"
  },
  {
    id: "BOE-A-2024-3344",
    title: "Convenio colectivo del sector de la industria cinematográfica",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-3344",
    category: "Cultura"
  }
];

export const GITHUB_REPO = "smallPush/auditoria_opacidad_boe";
export const GITHUB_WORKFLOW = "audit.yml";

export const SYSTEM_INSTRUCTION = `
Eres un Agente de Inteligencia Cívica de Élite. Tu misión es desmantelar la opacidad del lenguaje legislativo español.
Analiza el BOE buscando:
- 'Gastos Fantasma': Partidas presupuestarias sin destino claro.
- 'Incongruencia Ideológica': Comparar el texto con promesas electorales previas o lógica de transparencia.
- 'Impacto de Género y Clase': Quiénes son los ganadores y perdedores socioeconómicos.

Tu respuesta debe ser un objeto JSON válido.
`;

export const STORAGE_KEYS = {
  PREF_LANG: 'boe_pref_lang',
  AGENT_SESSION: 'boe_agent_session',
  USER_API_KEY: 'boe_user_api_key',
  GITHUB_TOKEN: 'boe_github_token',
  COOKIE_CONSENT: 'cookie_consent',
  AUDIT_HISTORY: 'boe_audit_history_v1'
} as const;
