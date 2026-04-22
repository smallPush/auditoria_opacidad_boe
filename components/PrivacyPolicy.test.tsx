import { expect, test, describe, mock, afterEach } from "bun:test";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import PrivacyPolicy from "./PrivacyPolicy";
import { translations } from "../translations";

// Mock react-router-dom
const mockNavigate = mock();

mock.module("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("PrivacyPolicy Component", () => {
  const t = translations.es;

  afterEach(() => {
    cleanup();
    mockNavigate.mockClear();
  });

  test("renders static texts correctly", () => {
    render(<PrivacyPolicy t={t} />);

    expect(screen.getByText(t.privacyTitle)).toBeTruthy();
    expect(screen.getByText(t.privacyIntro)).toBeTruthy();
    expect(screen.getByText(t.cookieTitle)).toBeTruthy();
    expect(screen.getByText(t.privacyCookies)).toBeTruthy();
    expect(screen.getByText(t.privacyPersonalDataTitle)).toBeTruthy();
    expect(screen.getByText(t.privacyData)).toBeTruthy();
    expect(screen.getByText(t.privacyRightsTitle)).toBeTruthy();
    expect(screen.getByText(t.privacyRights)).toBeTruthy();
    expect(screen.getByText(t.privacyLastUpdated)).toBeTruthy();
    expect(screen.getByText(t.backToHome)).toBeTruthy();
  });

  test("back button calls navigate(-1)", () => {
    render(<PrivacyPolicy t={t} />);

    const backButton = screen.getByText(t.backToHome);
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
