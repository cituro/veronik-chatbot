// Scaneaza un site pornind de la un URL: descarca paginile, extrage textul
// relevant (fara meniuri/scripturi) si urmareste linkurile interne, pana la
// o limita de pagini si adancime, ca sa nu scaneze la nesfarsit.

const cheerio = require("cheerio");

const DEFAULT_MAX_PAGES = 25;
const DEFAULT_MAX_DEPTH = 2;
const FETCH_TIMEOUT_MS = 10000;
const USER_AGENT = "SiteChatbotScanner/1.0 (+knowledge-base-indexer)";

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok || !contentType.includes("text/html")) return null;
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function extractPage(html, pageUrl) {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, svg, iframe, form").remove();

  const title = $("title").first().text().trim();

  const parts = [];
  $("h1, h2, h3, h4, p, li, td, th, blockquote, figcaption").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t && t.length > 1) parts.push(t);
  });
  const text = parts.join("\n");

  const links = new Set();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    try {
      const abs = new URL(href, pageUrl).toString();
      links.add(abs);
    } catch {
      // link invalid, ignoram
    }
  });

  return { title, text, links: Array.from(links) };
}

/**
 * Scaneaza un site pornind de la startUrl, ramanand pe acelasi domeniu.
 * onPage(pageInfo) este apelat pentru fiecare pagina reusita.
 */
async function crawlSite(startUrl, { maxPages = DEFAULT_MAX_PAGES, maxDepth = DEFAULT_MAX_DEPTH, onPage } = {}) {
  const start = normalizeUrl(startUrl);
  if (!start) throw new Error("URL invalid");
  const startHost = new URL(start).hostname;

  const visited = new Set();
  const queue = [{ url: start, depth: 0 }];
  const results = [];

  while (queue.length > 0 && results.length < maxPages) {
    const { url, depth } = queue.shift();
    const norm = normalizeUrl(url);
    if (!norm || visited.has(norm)) continue;
    visited.add(norm);

    let host;
    try {
      host = new URL(norm).hostname;
    } catch {
      continue;
    }
    if (host !== startHost) continue;

    const html = await fetchHtml(norm);
    if (!html) continue;

    const { title, text, links } = extractPage(html, norm);
    if (text && text.length > 50) {
      const page = { url: norm, title, text };
      results.push(page);
      if (onPage) onPage(page);
    }

    if (depth < maxDepth) {
      for (const link of links) {
        const normLink = normalizeUrl(link);
        if (normLink && !visited.has(normLink)) {
          queue.push({ url: normLink, depth: depth + 1 });
        }
      }
    }
  }

  return results;
}

module.exports = { crawlSite, normalizeUrl };
