import { ScrapedLaw } from "../types";

export const fetchAndParseBOE = async (url: string): Promise<ScrapedLaw[]> => {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AuditoriaCívica/1.0",
      },
    });
    if (!response.ok) return [];

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    // Handle both possible structures (REST API vs legacy xml.php)
    const items = xml.querySelectorAll("item");
    if (items.length === 0) return [];

    return Array.from(items).map((item: Element) => {
      // Identificador can be in an attribute (xml.php) or in a child node (REST API)
      const id =
        item.getAttribute("id") ||
        item.querySelector("identificador")?.textContent ||
        "";
      const titulo = item.querySelector("titulo")?.textContent || "Sin título";

      // Structure mapping:
      // REST API: item -> departamento (parent) @nombre
      // xml.xml: item -> departamento (ancestor) -> nombre
      const deptNode = item.closest("departamento");
      const departamento =
        deptNode?.getAttribute("nombre") ||
        deptNode?.querySelector("nombre")?.textContent ||
        "Varios";

      const seccionNode = item.closest("seccion");
      const seccionName =
        seccionNode?.getAttribute("nombre") ||
        seccionNode?.querySelector("nombre")?.textContent ||
        "I";

      return { id, titulo, departamento, seccion: seccionName };
    });
  } catch (e) {
    console.warn(`Failed to fetch from ${url}:`, e);
    return [];
  }
};

export const getLatestBOEUrls = (): string[] => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  return [
    `https://www.boe.es/datosabiertos/api/boe/sumario/${today}`,
    `https://www.boe.es/datosabiertos/api/boe/sumario/${yesterday}`,
    "https://www.boe.es/diario_boe/xml.php",
  ];
};

export const fetchLatestBOEArticles = async (): Promise<ScrapedLaw[]> => {
  const urls = getLatestBOEUrls();
  const fetchPromises = urls.map((url) => fetchAndParseBOE(url));

  // Process results in priority order
  for (const promise of fetchPromises) {
    const articles = await promise;
    if (articles.length > 0) {
      return articles;
    }
  }

  return [];
};
