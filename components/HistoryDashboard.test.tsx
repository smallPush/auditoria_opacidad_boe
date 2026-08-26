import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HistoryDashboard from "./HistoryDashboard";
import { translations } from "../translations";
import { AuditHistoryItem } from "../types";

const mockHistory: AuditHistoryItem[] = [
  {
    boeId: "BOE-A-2024-1001",
    title: "Real Decreto 1/2024 de Transparencia Digital",
    audit: {
      nivel_transparencia: 85,
      resumen_ciudadano: "Regulación de transparencia",
      analisis_critico: "Buen nivel de apertura",
      resumen_tweet: "Transparencia alta",
      banderas_rojas: [],
      comunidad_autonoma: "Estatal",
      tipologia: "Real Decreto",
    },
    timestamp: 1700000000000,
  },
  {
    boeId: "BOE-A-2024-2002",
    title: "Resolución de Contratación Opaca",
    audit: {
      nivel_transparencia: 20,
      resumen_ciudadano: "Contrato sin concurso",
      analisis_critico: "Opacidad crítica",
      resumen_tweet: "Opaco",
      banderas_rojas: ["Falta de licitación"],
      comunidad_autonoma: "Madrid",
      tipologia: "Resolución",
    },
    timestamp: 1710000000000,
  },
];

describe("HistoryDashboard Component", () => {
  const onImportMock = mock();

  beforeEach(() => {
    cleanup();
    onImportMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
  });

  test("renders list of audit history items", () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <HistoryDashboard
          history={mockHistory}
          onImport={onImportMock}
          lang="es"
          isLoggedIn={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("BOE-A-2024-1001")).toBeDefined();
    expect(screen.getByText("Real Decreto 1/2024 de Transparencia Digital")).toBeDefined();
    expect(screen.getByText("BOE-A-2024-2002")).toBeDefined();
    expect(screen.getByText("Resolución de Contratación Opaca")).toBeDefined();
  });

  test("filters items by search term", () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <HistoryDashboard
          history={mockHistory}
          onImport={onImportMock}
          lang="es"
          isLoggedIn={false}
        />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(translations.es.searchPlaceholder);
    fireEvent.change(searchInput, { target: { value: "Contratación" } });

    expect(screen.queryByText("Real Decreto 1/2024 de Transparencia Digital")).toBeNull();
    expect(screen.getByText("Resolución de Contratación Opaca")).toBeDefined();
  });

  test("filters items by URL search params", () => {
    render(
      <MemoryRouter initialEntries={["/history?min=0&max=33"]}>
        <HistoryDashboard
          history={mockHistory}
          onImport={onImportMock}
          lang="es"
          isLoggedIn={false}
        />
      </MemoryRouter>
    );

    // Only BOE-A-2024-2002 (transparency 20) should be visible
    expect(screen.queryByText("Real Decreto 1/2024 de Transparencia Digital")).toBeNull();
    expect(screen.getByText("Resolución de Contratación Opaca")).toBeDefined();
  });

  test("renders empty state message when no items match filters", () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <HistoryDashboard
          history={mockHistory}
          onImport={onImportMock}
          lang="es"
          isLoggedIn={false}
        />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(translations.es.searchPlaceholder);
    fireEvent.change(searchInput, { target: { value: "Inexistente" } });

    expect(screen.getByText(translations.es.noAuditsFound)).toBeDefined();
  });
});
