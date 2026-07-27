import { expect, test, describe, beforeEach, mock } from "bun:test";
import { fetchBoeXml } from "./boeService";

// Mock global fetch
const mockFetch = mock();
global.fetch = mockFetch;

// Mock DOMParser for non-browser environment
class MockDOMParser {
  parseFromString(xml: string) {
    return {
      querySelector: (selector: string) => {
        if (selector === "titulo" && xml.includes("<titulo>Real Title</titulo>")) {
          return { textContent: "Real Title" };
        }
        return null;
      }
    };
  }
}
global.DOMParser = MockDOMParser as any;

describe("boeService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  test("fetchBoeXml returns fallback XML when fetch fails", async () => {
    const boeId = "BOE-A-2024-TEST";
    const initialTitle = "Test Document";

    // Simulate fetch failure
    mockFetch.mockImplementation(() => Promise.reject(new Error("CORS Blocked")));

    const { xmlText, docTitle } = await fetchBoeXml(boeId, initialTitle);

    expect(xmlText).toContain(`<item id="${boeId}">`);
    expect(xmlText).toContain(`<titulo>${initialTitle}</titulo>`);
    expect(xmlText).toContain("Contenido simulado para auditoría...");
    expect(docTitle).toBe(initialTitle);
  });

  test("fetchBoeXml returns fallback XML when response is not ok", async () => {
    const boeId = "BOE-A-2024-TEST";
    const initialTitle = "Test Document";

    mockFetch.mockResolvedValue({
      ok: false
    });

    const { xmlText, docTitle } = await fetchBoeXml(boeId, initialTitle);

    expect(xmlText).toContain(`<item id="${boeId}">`);
    expect(docTitle).toBe(initialTitle);
  });

  test("fetchBoeXml returns real XML and updates title on success", async () => {
    const boeId = "BOE-A-2024-TEST";
    const initialTitle = "Test Document";
    const mockXml = `<boe><titulo>Real Title</titulo></boe>`;

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => mockXml
    });

    const { xmlText, docTitle } = await fetchBoeXml(boeId, initialTitle);

    expect(xmlText).toBe(mockXml);
    expect(docTitle).toBe("Real Title");
  });
});
