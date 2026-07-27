import { expect, test, describe, afterEach, spyOn } from "bun:test";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import GoogleAnalytics from "./GoogleAnalytics";

describe("GoogleAnalytics component", () => {
    afterEach(() => {
        cleanup();
    });

    test("renders without crashing", () => {
        const { container } = render(<GoogleAnalytics />);
        expect(container).toBeDefined();
    });

    test("does not log to console on render", () => {
        const logSpy = spyOn(console, "log");
        render(<GoogleAnalytics />);
        expect(logSpy).not.toHaveBeenCalled();
        logSpy.mockRestore();
    });
});
