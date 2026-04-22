import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuditDashboard from "./AuditDashboard";
import { translations } from "../translations";
import { BOEAuditResponse } from "../types";

// Mock services
const mockPostTweet = mock();
mock.module("../services/twitterService", () => ({
  postTweet: mockPostTweet,
}));

const mockSaveAuditToDB = mock();
mock.module("../services/supabaseService", () => ({
  saveAuditToDB: mockSaveAuditToDB,
}));

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

    mockPostTweet.mockClear();
    mockSaveAuditToDB.mockClear();
  });

  afterEach(() => {
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

    mockPostTweet.mockRejectedValueOnce(new Error("Network failure"));

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
      expect(mockPostTweet).toHaveBeenCalled();
    });

    expect(consoleErrorMock).toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith("Error posting tweet: Network failure");
    expect(mockSaveAuditToDB).not.toHaveBeenCalled();
  });
});
