import { expect, test, describe, mock, afterEach, beforeEach } from "bun:test";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CookieConsent from "./CookieConsent";
import { translations } from "../translations";
import { STORAGE_KEYS } from "../constants";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: mock((key: string) => store[key] || null),
    setItem: mock((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: mock((key: string) => {
      delete store[key];
    }),
    clear: mock(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe("CookieConsent Component", () => {
  const t = translations.es;

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders correctly when no consent is in localStorage", () => {
    render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT);

    // Check if texts are rendered
    expect(screen.getByText(t.cookieTitle)).toBeTruthy();
    expect(screen.getByText(t.cookieText)).toBeTruthy();
    expect(screen.getByText(t.privacyPolicy)).toBeTruthy();

    // Check if buttons are rendered
    expect(screen.getByText(t.cookieAccept)).toBeTruthy();
    expect(screen.getByText(t.cookieReject)).toBeTruthy();
  });

  test("does not render when consent is already granted", () => {
    localStorageMock.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'true');

    const { container } = render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT);
    expect(container.firstChild).toBeNull();
  });

  test("does not render when consent is already rejected", () => {
    localStorageMock.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'false');

    const { container } = render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT);
    expect(container.firstChild).toBeNull();
  });

  test("sets localStorage and hides when accept is clicked", () => {
    render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    const acceptButton = screen.getByText(t.cookieAccept);
    fireEvent.click(acceptButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT, 'true');

    // Component should be hidden after click
    expect(screen.queryByText(t.cookieTitle)).toBeNull();
  });

  test("sets localStorage and hides when reject is clicked", () => {
    render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    const rejectButton = screen.getByText(t.cookieReject);
    fireEvent.click(rejectButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT, 'false');

    // Component should be hidden after click
    expect(screen.queryByText(t.cookieTitle)).toBeNull();
  });
});
