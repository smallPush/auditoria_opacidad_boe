import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import { STORAGE_KEYS } from "../../constants";
import { BOEAuditResponse } from "../../types";

const sampleAudit: BOEAuditResponse = {
  nivel_transparencia: 75,
  resumen_ciudadano: "Resumen de prueba",
  analisis_critico: "Analisis de prueba",
  resumen_tweet: "Tweet de prueba",
  banderas_rojas: ["Falta de transparencia"],
  vencedores_vencidos: {
    ganadores: ["Empresa A"],
    perdedores: ["Ciudadanía"],
  },
  comunidad_autonoma: "Madrid",
  tipologia: "Resolución",
};

// Ensure localStorage is available in test environment
const getStorage = (): Storage => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis.localStorage !== "undefined" && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  let store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as unknown as Storage;
  globalThis.localStorage = mockStorage;
  return mockStorage;
};

import { getAuditHistory, saveAuditToDB, clearLocalHistory } from "../supabaseService";

describe("supabaseService", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = getStorage();
    storage.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  test("getAuditHistory returns merged history without throwing", async () => {
    storage.setItem(
      STORAGE_KEYS.AUDIT_HISTORY,
      JSON.stringify([
        {
          boeId: "BOE-A-2024-TEST",
          title: "Test Audit",
          audit: sampleAudit,
          timestamp: 1700000000000,
        },
      ])
    );

    const history = await getAuditHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);

    const firstItem = history.find((h) => h.boeId === "BOE-A-2024-TEST");
    expect(firstItem).toBeDefined();
    expect(firstItem?.title).toBe("Test Audit");
    expect(firstItem?.audit).toBeDefined();
  });

  test("getAuditHistory gracefully handles malformed or empty localStorage", async () => {
    storage.setItem(STORAGE_KEYS.AUDIT_HISTORY, "INVALID_JSON{[[");

    const history = await getAuditHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test("saveAuditToDB stores new item into localStorage", async () => {
    await saveAuditToDB("BOE-A-TEST-9999", "Test Document Title", sampleAudit);

    const stored = storage.getItem(STORAGE_KEYS.AUDIT_HISTORY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed[0].boeId).toBe("BOE-A-TEST-9999");
    expect(parsed[0].title).toBe("Test Document Title");
  });

  test("saveAuditToDB handles localStorage QuotaExceededError without crashing", async () => {
    const originalSetItem = storage.setItem;
    storage.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };

    // Should not throw
    await saveAuditToDB("BOE-A-TEST-8888", "Quota Overflow Test", sampleAudit);

    storage.setItem = originalSetItem;
  });

  test("clearLocalHistory clears STORAGE_KEYS.AUDIT_HISTORY", () => {
    storage.setItem(STORAGE_KEYS.AUDIT_HISTORY, JSON.stringify([{ boeId: "123" }]));
    clearLocalHistory();
    expect(storage.getItem(STORAGE_KEYS.AUDIT_HISTORY)).toBeNull();
  });
});
