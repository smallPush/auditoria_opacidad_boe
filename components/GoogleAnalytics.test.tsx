import { expect, test, describe, beforeEach, afterEach, spyOn, mock } from "bun:test";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import GoogleAnalytics from "./GoogleAnalytics";

describe("GoogleAnalytics component", () => {
    let originalDev: boolean;
    let originalGaId: string | undefined;
    let originalGaInitialized: boolean | undefined;

    beforeEach(() => {
        // Save original environment
        originalDev = import.meta.env.DEV;
        originalGaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
        originalGaInitialized = window.GA_INITIALIZED;
    });

    afterEach(() => {
        // Restore environment
        // @ts-ignore
        import.meta.env.DEV = originalDev;
        // @ts-ignore
        import.meta.env.VITE_GOOGLE_ANALYTICS_ID = originalGaId;
        window.GA_INITIALIZED = originalGaInitialized;

        cleanup();
    });

    test("logs initialization when DEV is true and GA_INITIALIZED is true", () => {
        // @ts-ignore
        import.meta.env.DEV = true;
        // @ts-ignore
        import.meta.env.VITE_GOOGLE_ANALYTICS_ID = "G-12345";
        window.GA_INITIALIZED = true;

        const logSpy = spyOn(console, "log");
        render(<GoogleAnalytics />);

        expect(logSpy).toHaveBeenCalledWith(
            "📊 Google Analytics: Already initialized via <head> with ID",
            "G-12345"
        );
        logSpy.mockRestore();
    });

    test("logs ID found but not initialized when DEV is true, GA_INITIALIZED is false, and ID is present", () => {
        // @ts-ignore
        import.meta.env.DEV = true;
        // @ts-ignore
        import.meta.env.VITE_GOOGLE_ANALYTICS_ID = "G-12345";
        window.GA_INITIALIZED = false;

        const logSpy = spyOn(console, "log");
        render(<GoogleAnalytics />);

        expect(logSpy).toHaveBeenCalledWith(
            "📊 Google Analytics: ID found but not initialized. Check if it is blocked or misconfigured."
        );
        logSpy.mockRestore();
    });

    test("logs no valid ID found when DEV is true, GA_INITIALIZED is false, and ID is absent", () => {
        // @ts-ignore
        import.meta.env.DEV = true;
        // @ts-ignore
        import.meta.env.VITE_GOOGLE_ANALYTICS_ID = undefined;
        window.GA_INITIALIZED = false;

        const logSpy = spyOn(console, "log");
        render(<GoogleAnalytics />);

        expect(logSpy).toHaveBeenCalledWith(
            "📊 Google Analytics: No valid ID found in environment."
        );
        logSpy.mockRestore();
    });

    test("does not log when DEV is false", () => {
        // @ts-ignore
        import.meta.env.DEV = false;
        // @ts-ignore
        import.meta.env.VITE_GOOGLE_ANALYTICS_ID = "G-12345";
        window.GA_INITIALIZED = true;

        const logSpy = spyOn(console, "log");
        render(<GoogleAnalytics />);

        expect(logSpy).not.toHaveBeenCalled();
        logSpy.mockRestore();
    });
});
