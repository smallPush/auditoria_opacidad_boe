import { expect, test, describe, spyOn, mock, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AuditDashboard from "./AuditDashboard";
import { translations } from "../translations";
import { BOEAuditResponse } from "../types";
import * as twitterService from "../services/twitterService";
import * as supabaseService from "../services/supabaseService";

// Mock recharts
mock.module("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
}));

describe("AuditDashboard Component - Error Paths", () => {
  let consoleErrorMock: any;
  let alertMock: any;

  beforeEach(() => {
    consoleErrorMock = mock();
    alertMock = mock();
    global.console.error = consoleErrorMock;
    global.alert = alertMock;
  });

  afterEach(() => {
    cleanup();
    mock.restore();
  });

  test("handles error when postTweet fails", async () => {
    const mockData: BOEAuditResponse = {
      nivel_transparencia: 50,
      resumen_ciudadano: "Resumen test",
      analisis_critico: "Analisis test",
      resumen_tweet: "Tweet test",
      banderas_rojas: ["Bandera 1"],
      vencedores_vencidos: {
        ganadores: ["Ganador"],
        perdedores: ["Perdedor"],
      },
      comunidad_autonoma: "Madrid",
      tipologia: "Decreto",
      tweet_sent: false,
    };

    const postTweetSpy = spyOn(twitterService, "postTweet").mockRejectedValueOnce(
      new Error("Network failure")
    );
    const saveAuditSpy = spyOn(supabaseService, "saveAuditToDB");

    render(
      <AuditDashboard
        data={mockData}
        boeId="BOE-TEST-123"
        title="Test Title"
        lang="es"
        isLoggedIn={true}
      />
    );

    const postTweetButton = screen.getByText(translations.es.postTweet);
    fireEvent.click(postTweetButton);

    await waitFor(() => {
      expect(postTweetSpy).toHaveBeenCalled();
    });

    expect(consoleErrorMock).toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith("Error posting tweet: Network failure");
    expect(saveAuditSpy).not.toHaveBeenCalled();

    postTweetSpy.mockRestore();
    saveAuditSpy.mockRestore();
  });

  test("renders citizen feedback and registers vote", () => {
    const mockData: BOEAuditResponse = {
      nivel_transparencia: 40,
      resumen_ciudadano: "Resumen test",
      analisis_critico: "Analisis test",
      resumen_tweet: "Tweet test",
      banderas_rojas: ["Bandera 1"],
      vencedores_vencidos: {
        ganadores: ["Ganador"],
        perdedores: ["Perdedor"],
      },
      comunidad_autonoma: "Madrid",
      tipologia: "Decreto",
      tweet_sent: false,
    };

    render(
      <AuditDashboard
        data={mockData}
        boeId="BOE-ENGAGE-1"
        title="Test Title"
        lang="es"
      />
    );

    expect(screen.getByText(translations.es.citizenFeedback)).toBeDefined();
    const clearBtn = screen.getByText(translations.es.feedbackClear);
    fireEvent.click(clearBtn);

    expect(screen.getByText(translations.es.feedbackThanks)).toBeDefined();
    expect(window.localStorage.getItem("boe_vote_BOE-ENGAGE-1")).toBe("clear");
  });

  test("handles copying direct audit link", () => {
    const writeTextMock = mock(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    const mockData: BOEAuditResponse = {
      nivel_transparencia: 40,
      resumen_ciudadano: "Resumen test",
      analisis_critico: "Analisis test",
      resumen_tweet: "Tweet test",
      banderas_rojas: ["Bandera 1"],
      vencedores_vencidos: {
        ganadores: ["Ganador"],
        perdedores: ["Perdedor"],
      },
      comunidad_autonoma: "Madrid",
      tipologia: "Decreto",
      tweet_sent: false,
    };

    render(
      <AuditDashboard
        data={mockData}
        boeId="BOE-ENGAGE-2"
        title="Test Title"
        lang="es"
      />
    );

    const copyBtn = screen.getByText(translations.es.copyDirectLink);
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("https://radarboe.es/audit/BOE-ENGAGE-2");
    expect(screen.getByText(translations.es.linkCopied)).toBeDefined();
  });

  test("renders related audits when history is provided", () => {
    const mockData: BOEAuditResponse = {
      nivel_transparencia: 40,
      resumen_ciudadano: "Resumen test",
      analisis_critico: "Analisis test",
      resumen_tweet: "Tweet test",
      banderas_rojas: ["Bandera 1"],
      vencedores_vencidos: {
        ganadores: ["Ganador"],
        perdedores: ["Perdedor"],
      },
      comunidad_autonoma: "Madrid",
      tipologia: "Decreto",
      tweet_sent: false,
    };

    const mockHistory = [
      {
        boeId: "BOE-ENGAGE-3",
        title: "Current doc",
        date: "2026-09-01",
        audit: mockData,
      },
      {
        boeId: "BOE-RELATED-1",
        title: "Relacionada Ley Sanidad",
        date: "2026-09-02",
        audit: { ...mockData, nivel_transparencia: 15 },
      },
    ];

    render(
      <AuditDashboard
        data={mockData}
        boeId="BOE-ENGAGE-3"
        title="Current doc"
        lang="es"
        history={mockHistory}
      />
    );

    expect(screen.getByText(translations.es.relatedAudits)).toBeDefined();
    expect(screen.getByText("Relacionada Ley Sanidad")).toBeDefined();
  });
});
