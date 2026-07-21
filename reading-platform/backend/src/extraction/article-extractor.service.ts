import { BadRequestException, Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ExtractedArticle {
  title: string;
  author: string | null;
  contentHtml: string;
  excerpt: string | null;
  wordCount: number;
  coverUrl: string | null;
}

@Injectable()
export class ArticleExtractorService {
  /**
   * Fetches a URL and extracts the main readable content, stripping ads,
   * nav, sidebars, comments, etc. Mirrors what Reader-mode browsers do.
   */
  async extractFromUrl(url: string): Promise<ExtractedArticle> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('That does not look like a valid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Only http/https URLs are supported');
    }

    let html: string;
    try {
      const res = await fetch(parsed.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ReadingPlatformBot/1.0; +https://example.com/bot)',
        },
        redirect: 'follow',
      });
      if (!res.ok) {
        throw new Error(`Upstream returned ${res.status}`);
      }
      html = await res.text();
    } catch (err) {
      throw new BadRequestException(
        `Could not fetch that URL: ${(err as Error).message}`,
      );
    }

    const dom = new JSDOM(html, { url: parsed.toString() });

    // Best-effort cover image before Readability strips <head>/meta context
    const ogImage = dom.window.document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content');

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content) {
      throw new BadRequestException(
        'Could not extract readable content from that page',
      );
    }

    const text = article.textContent || '';
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    return {
      title: article.title || parsed.hostname,
      author: article.byline || null,
      contentHtml: article.content,
      excerpt: article.excerpt || null,
      wordCount,
      coverUrl: ogImage || null,
    };
  }
}
