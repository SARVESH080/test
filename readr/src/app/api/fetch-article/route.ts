import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Stateless passthrough fetcher.
 *
 * This route exists for exactly one reason: browsers block cross-origin
 * fetches of arbitrary article pages (CORS), so a same-origin hop is
 * required to retrieve the raw HTML before Readability parses it
 * client-side. It stores nothing, requires no auth, and keeps no state
 * between requests — it is a pure fetch-and-return proxy, not a backend
 * in the app/database sense.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http/https URLs are supported" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page (status ${res.status})` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("xml")) {
      return NextResponse.json(
        { error: "URL does not point to an HTML page" },
        { status: 415 }
      );
    }

    const html = await res.text();
    return NextResponse.json({ html, finalUrl: res.url || parsed.toString() });
  } catch {
    return NextResponse.json(
      { error: "Could not reach that URL. Check the link and try again." },
      { status: 502 }
    );
  }
}
