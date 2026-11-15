import { ScrapedLaw } from "../types";

export const fetchAndParseBOE = async (
  url: string,
  timeoutMs = 5000,
): Promise<ScrapedLaw[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        Accept: "application/xml",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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

export const getLatestBOEUrls = (referenceDate = new Date(), days = 5): string[] => {
  const urls: string[] = [];
  const baseTime = referenceDate.getTime();
  const ONE_DAY = 86400000;

  for (let i = 0; i < days; i++) {
    const d = new Date(baseTime - i * ONE_DAY);
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
    urls.push(`https://www.boe.es/datosabiertos/api/boe/sumario/${dateStr}`);
  }

  return urls;
};

export const fetchLatestBOEArticles = async (): Promise<ScrapedLaw[]> => {
  const urls = getLatestBOEUrls();

  // Try URLs in priority order (most recent first) until articles are found
  for (const url of urls) {
    const articles = await fetchAndParseBOE(url);
    if (articles.length > 0) {
      return articles;
    }
  }

  return [];
};

