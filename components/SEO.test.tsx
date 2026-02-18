import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import SEO from "./SEO";

describe("SEO component", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  afterEach(() => {
    cleanup();
  });

  test("updates document title with suffix", () => {
    render(<SEO title="Test Title" description="Test Description" />);
    expect(document.title).toBe("Test Title | Auditoría BOE");
  });

  test("updates description meta tag", () => {
    render(<SEO title="Test Title" description="Test Description" />);
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute("content")).toBe("Test Description");
  });

  test("updates keywords meta tag when provided", () => {
    render(<SEO title="Title" description="Desc" keywords={["word1", "word2"]} />);
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    expect(metaKeywords?.getAttribute("content")).toBe("word1, word2");
  });

  test("does not update keywords meta tag when not provided", () => {
    render(<SEO title="Title" description="Desc" />);
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    expect(metaKeywords).toBeNull();
  });

  test("updates Open Graph tags", () => {
    render(<SEO title="OG Title" description="OG Description" image="https://example.com/image.png" />);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twitterImage = document.querySelector('meta[property="twitter:image"]');

    expect(ogTitle?.getAttribute("content")).toBe("OG Title");
    expect(ogDescription?.getAttribute("content")).toBe("OG Description");
    expect(ogImage?.getAttribute("content")).toBe("https://example.com/image.png");
    expect(twitterImage?.getAttribute("content")).toBe("https://example.com/image.png");
  });

  test("updates existing meta tags instead of creating duplicates", () => {
    // Pre-create meta tag
    const existingMeta = document.createElement('meta');
    existingMeta.setAttribute('name', 'description');
    existingMeta.setAttribute('content', 'Old Description');
    document.head.appendChild(existingMeta);

    render(<SEO title="Title" description="New Description" />);

    const descriptions = document.querySelectorAll('meta[name="description"]');
    expect(descriptions.length).toBe(1);
    expect(descriptions[0].getAttribute("content")).toBe("New Description");
  });
});
