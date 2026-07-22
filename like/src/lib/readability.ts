import { Readability } from "@mozilla/readability";
import type { ArticleData } from "./types";

/**
 * Parses raw HTML (already fetched) into a clean, ebook-style article
 * using Mozilla's Readability. Runs entirely client-side via DOMParser —
 * no server round-trip beyond the initial CORS-proxied fetch.
 */
export function extractArticle(html: string, sourceUrl: string): ArticleData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Strip elements Readability sometimes leaves behind that we explicitly
  // never want in a clean reading view.
  doc.querySelectorAll("script, style, noscript, iframe, .ad, .ads, [class*='advert']").forEach(
    (el) => el.remove()
  );

  // Ensure relative URLs (images, links) resolve against the source.
  const base = doc.createElement("base");
  base.href = sourceUrl;
  doc.head.appendChild(base);

  const reader = new Readability(doc, {
    charThreshold: 400,
  });
  const result = reader.parse();

  if (!result || !result.content) {
    throw new Error(
      "Could not extract readable article content from this page."
    );
  }

  return {
    title: result.title || "Untitled Article",
    byline: result.byline,
    siteName: result.siteName,
    contentHtml: result.content,
    excerpt: result.excerpt,
    length: result.length ?? 0,
    sourceUrl,
  };
}
