import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getLatestBOEUrls, fetchAndParseBOE, fetchLatestBOEArticles } from '../boeService';

const SAMPLE_BOE_XML = `<?xml version="1.0" encoding="utf-8"?>
<response>
  <status><code>200</code><text>ok</text></status>
  <data>
    <sumario>
      <metadatos>
        <publicacion>BOE</publicacion>
        <fecha_publicacion>20261114</fecha_publicacion>
      </metadatos>
      <diario numero="284">
        <seccion codigo="1" nombre="I. Disposiciones generales">
          <departamento codigo="5140" nombre="MINISTERIO DE HACIENDA">
            <epigrafe nombre="Tabaco. Precios">
              <item>
                <identificador>BOE-A-2026-23823</identificador>
                <titulo>Resolución de precios de tabaco</titulo>
              </item>
            </epigrafe>
          </departamento>
        </seccion>
      </diario>
    </sumario>
  </data>
</response>`;

describe('boeService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getLatestBOEUrls', () => {
    it('generates 5 URLs by default in descending date order', () => {
      const fixedDate = new Date('2026-11-15T12:00:00Z');
      const urls = getLatestBOEUrls(fixedDate);

      expect(urls).toHaveLength(5);
      expect(urls[0]).toBe('https://www.boe.es/datosabiertos/api/boe/sumario/20261115');
      expect(urls[1]).toBe('https://www.boe.es/datosabiertos/api/boe/sumario/20261114');
      expect(urls[2]).toBe('https://www.boe.es/datosabiertos/api/boe/sumario/20261113');
      expect(urls[3]).toBe('https://www.boe.es/datosabiertos/api/boe/sumario/20261112');
      expect(urls[4]).toBe('https://www.boe.es/datosabiertos/api/boe/sumario/20261111');
    });

    it('allows specifying custom number of days', () => {
      const fixedDate = new Date('2026-11-15T12:00:00Z');
      const urls = getLatestBOEUrls(fixedDate, 3);
      expect(urls).toHaveLength(3);
    });
  });

  describe('fetchAndParseBOE', () => {
    it('parses valid BOE XML items correctly', async () => {
      global.fetch = (() =>
        Promise.resolve(new Response(SAMPLE_BOE_XML, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        }))) as any;

      const articles = await fetchAndParseBOE('https://www.boe.es/datosabiertos/api/boe/sumario/20261114');
      expect(articles).toHaveLength(1);
      expect(articles[0].id).toBe('BOE-A-2026-23823');
      expect(articles[0].titulo).toBe('Resolución de precios de tabaco');
      expect(articles[0].departamento).toBe('MINISTERIO DE HACIENDA');
      expect(articles[0].seccion).toBe('I. Disposiciones generales');
    });

    it('returns empty array when response is not ok', async () => {
      global.fetch = (() =>
        Promise.resolve(new Response('Not Found', { status: 404 }))) as any;

      const articles = await fetchAndParseBOE('https://www.boe.es/datosabiertos/api/boe/sumario/20261115');
      expect(articles).toEqual([]);
    });

    it('returns empty array when fetch throws an error (e.g. CORS block)', async () => {
      global.fetch = (() =>
        Promise.reject(new TypeError('Failed to fetch'))) as any;

      const articles = await fetchAndParseBOE('https://www.boe.es/datosabiertos/api/boe/sumario/20261115');
      expect(articles).toEqual([]);
    });
  });

  describe('fetchLatestBOEArticles', () => {
    it('returns articles from the first successful sumario', async () => {
      let callCount = 0;
      global.fetch = ((url: string) => {
        callCount++;
        // First URL (today, e.g. Sunday) fails with 404
        if (callCount === 1) {
          return Promise.resolve(new Response('Not found', { status: 404 }));
        }
        // Second URL (yesterday, Saturday) succeeds
        return Promise.resolve(new Response(SAMPLE_BOE_XML, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        }));
      }) as any;

      const articles = await fetchLatestBOEArticles();
      expect(articles).toHaveLength(1);
      expect(articles[0].id).toBe('BOE-A-2026-23823');
      expect(callCount).toBe(2); // Stops as soon as articles are found
    });

    it('returns empty array if all URLs fail', async () => {
      global.fetch = (() =>
        Promise.resolve(new Response('Not found', { status: 404 }))) as any;

      const articles = await fetchLatestBOEArticles();
      expect(articles).toEqual([]);
    });
  });
});
