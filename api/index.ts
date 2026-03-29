import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as cheerio from "cheerio";

const BASE_URL = "https://klikfilm.web.id";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Referer: BASE_URL,
};

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function extractSlug(url: string): string {
  return url.replace(/\/$/, "").split("/").pop() || url;
}

function parseCard($: cheerio.CheerioAPI, el: cheerio.Element) {
  const $el = $(el);
  const linkEl = $el.find("a").first();
  const url = linkEl.attr("href") || "";
  const title =
    $el.find(".title, h2, h3, .movie-title, .entry-title").first().text().trim() ||
    linkEl.attr("title") ||
    $el.find("img").attr("alt") ||
    "";
  const poster =
    $el.find("img").attr("src") ||
    $el.find("img").attr("data-src") ||
    $el.find("img").attr("data-lazy-src") ||
    "";
  const quality = $el.find(".quality, .qlty, [class*='quality']").first().text().trim() || "";
  const rating = $el.find(".rating, .imdb, [class*='rating']").first().text().trim() || "";
  const year = $el.find(".year, [class*='year'], .date").first().text().trim() || "";
  const genreText = $el.find(".genre, [class*='genre']").first().text().trim() || "";
  const genre = genreText ? genreText.split(/[,/|]/).map((g) => g.trim()).filter(Boolean) : [];
  return { title, slug: extractSlug(url), poster, year, rating, genre, quality, url };
}

async function scrapeMovies(page = 1, genre?: string, search?: string) {
  let url = BASE_URL;
  if (search) {
    url = `${BASE_URL}/?s=${encodeURIComponent(search)}`;
    if (page > 1) url += `&paged=${page}`;
  } else if (genre) {
    url = `${BASE_URL}/genre/${encodeURIComponent(genre)}/`;
    if (page > 1) url += `page/${page}/`;
  } else if (page > 1) {
    url = `${BASE_URL}/page/${page}/`;
  }

  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const movies: ReturnType<typeof parseCard>[] = [];

  const selectors = [
    ".movies-list article",
    ".film-list article",
    "article.movies",
    "article",
    ".item",
  ];
  for (const sel of selectors) {
    $(sel).each((_i, el) => {
      const m = parseCard($, el);
      if (m.title && m.url) movies.push(m);
    });
    if (movies.length > 0) break;
  }

  let totalPages = 1;
  const pageNums = $(".page-numbers")
    .map((_i, el) => parseInt($(el).text().trim(), 10))
    .get()
    .filter((n) => !isNaN(n));
  if (pageNums.length > 0) totalPages = Math.max(...pageNums);

  return { movies, totalPages, currentPage: page };
}

async function scrapeDetail(slug: string) {
  const url = `${BASE_URL}/${slug}/`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const title = $("h1.entry-title, h1.title, .film-title, h1").first().text().trim() || slug;
  const poster =
    $(".poster img, .film-poster img, .wp-post-image").first().attr("src") ||
    $(".poster img").first().attr("data-src") ||
    "";
  const synopsis =
    $(".synopsis, .overview, .entry-content p, [class*='sinopsis']").first().text().trim() || "";

  function getMeta(...labels: string[]) {
    for (const label of labels) {
      const found = $(`*:contains("${label}")`)
        .filter((_i, el) => $(el).children().length === 0)
        .first()
        .closest("li, tr, p, span, div")
        .find("a, span")
        .first()
        .text()
        .trim();
      if (found) return found;
    }
    return "";
  }

  const year = getMeta("Tahun", "Year", "Released") || $("[class*='year']").first().text().trim() || "";
  const duration = getMeta("Durasi", "Duration", "Runtime") || "";
  const country = getMeta("Negara", "Country") || "";
  const director = getMeta("Sutradara", "Director") || "";
  const quality = $(".quality, .qlty").first().text().trim() || "";
  const rating = $(".imdb, .rating").first().text().trim() || "";

  const cast: string[] = [];
  $("[class*='cast'] a, [class*='actor'] a, [class*='pemain'] a").each((_i, el) => {
    const n = $(el).text().trim();
    if (n) cast.push(n);
  });

  const genre: string[] = [];
  $("[class*='genre'] a, .genres a").each((_i, el) => {
    const g = $(el).text().trim();
    if (g) genre.push(g);
  });

  const streamUrls: string[] = [];
  $("iframe").each((_i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src && !streamUrls.includes(src)) streamUrls.push(src);
  });

  return { title, slug, poster, year, rating, genre, quality, url, synopsis, duration, country, director, cast, streamUrls };
}

async function scrapeGenres() {
  const html = await fetchPage(BASE_URL);
  const $ = cheerio.load(html);
  const genres: string[] = [];
  $("[class*='genre'] a, .genre-list a, nav a[href*='/genre/']").each((_i, el) => {
    const t = $(el).text().trim();
    if (t && !genres.includes(t)) genres.push(t);
  });
  return genres;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const path = (req.url || "").replace(/^\/api/, "").replace(/\?.*/, "");

  try {
    if (path === "/genres") {
      const genres = await scrapeGenres();
      return res.json({ genres });
    }

    if (path === "/movies" || path === "/movies/") {
      const page = parseInt((req.query.page as string) || "1", 10);
      const genre = (req.query.genre as string) || undefined;
      const search = (req.query.search as string) || undefined;
      const result = await scrapeMovies(page, genre, search);
      return res.json(result);
    }

    const movieMatch = path.match(/^\/movies\/(.+)$/);
    if (movieMatch) {
      const slug = movieMatch[1];
      const detail = await scrapeDetail(slug);
      return res.json(detail);
    }

    return res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
  } catch (err: unknown) {
    return res.status(500).json({
      error: "SCRAPE_ERROR",
      message: err instanceof Error ? err.message : "Scraping failed",
    });
  }
}
