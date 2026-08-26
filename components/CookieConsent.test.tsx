import { expect, test, describe, spyOn, afterEach, beforeEach } from "bun:test";

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CookieConsent from "./CookieConsent";
import { translations } from "../translations";
import { STORAGE_KEYS } from "../constants";

// Storage mock without destroying functions on mock.restore()
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => {
    store[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key in store) delete store[key];
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (index: number) => Object.keys(store)[index] || null,
};

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
  });

  afterEach(() => {
    cleanup();
  });

  test("renders correctly when no consent is in localStorage", () => {
    const getItemSpy = spyOn(localStorageMock, "getItem");
    render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT);
    getItemSpy.mockRestore();

    // Check if texts are rendered
    expect(screen.getByText(t.cookieTitle)).toBeTruthy();
    expect(screen.getByText(t.cookieText)).toBeTruthy();
    expect(screen.getByText(t.privacyPolicy)).toBeTruthy();

    // Check if buttons are rendered
    expect(screen.getByText(t.cookieAccept)).toBeTruthy();
    expect(screen.getByText(t.cookieReject)).toBeTruthy();
  });

  test("does not render when consent is already granted", () => {
    const getItemSpy = spyOn(localStorageMock, "getItem");
    localStorageMock.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'true');

    const { container } = render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT);
    getItemSpy.mockRestore();
    expect(container.firstChild).toBeNull();
  });

  test("does not render when consent is already rejected", () => {
    const getItemSpy = spyOn(localStorageMock, "getItem");
    localStorageMock.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'false');

    const { container } = render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT);
    getItemSpy.mockRestore();
    expect(container.firstChild).toBeNull();
  });

  test("sets localStorage and hides when accept is clicked", () => {
    const setItemSpy = spyOn(localStorageMock, "setItem");
    render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    const acceptButton = screen.getByText(t.cookieAccept);
    fireEvent.click(acceptButton);

    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT, 'true');
    setItemSpy.mockRestore();

    // Component should be hidden after click
    expect(screen.queryByText(t.cookieTitle)).toBeNull();
  });

  test("sets localStorage and hides when reject is clicked", () => {
    const setItemSpy = spyOn(localStorageMock, "setItem");
    render(
      <MemoryRouter>
        <CookieConsent t={t} />
      </MemoryRouter>
    );

    const rejectButton = screen.getByText(t.cookieReject);
    fireEvent.click(rejectButton);

    expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.COOKIE_CONSENT, 'false');
    setItemSpy.mockRestore();

    // Component should be hidden after click
    expect(screen.queryByText(t.cookieTitle)).toBeNull();
  });
});
