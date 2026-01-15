
import { BOEArticle } from './types';

// This simulates the JSON file with URLs to search for BOE articles
export const BOE_SOURCES: BOEArticle[] = [
  {
    id: "BOE-A-2024-4161",
    title: "Ley de Presupuestos Generales",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-4161",
    category: "Economía"
  },
  {
    id: "BOE-A-2024-5012",
    title: "Reforma del Mercado de Trabajo",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-5012",
    category: "Social"
  },
  {
    id: "BOE-A-2024-6123",
    title: "Regulación de Vivienda Pública",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-6123",
    category: "Vivienda"
  },
  {
    id: "BOE-A-2024-7788",
    title: "Subvenciones a la Innovación Digital",
    url: "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-7788",
    category: "Tecnología"
  }
];

export const SYSTEM_INSTRUCTION = `
Eres un Agente de Inteligencia Cívica de Élite. Tu misión es desmantelar la opacidad del lenguaje legislativo español.
Analiza el BOE buscando:
- 'Gastos Fantasma': Partidas presupuestarias sin destino claro.
- 'Incongruencia Ideológica': Comparar el texto con promesas electorales previas o lógica de transparencia.
- 'Impacto de Género y Clase': Quiénes son los ganadores y perdedores socioeconómicos.

Tu respuesta debe ser un objeto JSON válido.
`;
