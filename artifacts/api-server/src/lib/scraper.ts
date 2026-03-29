import * as cheerio from "cheerio";

const BASE_URL = "https://klikfilm.web.id";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: BASE_URL,
  "Cache-Control": "no-cache",
};

// Known ad/redirect domains to skip when resolving video URLs
const AD_DOMAINS = [
  "popads", "adsterra", "monetag", "hilltopads", "adcash",
  "propellerads", "exoclick", "trafficjunky", "mgid",
  "revcontent", "taboola", "outbrain", "shareaholic",
];

async function fetchPage(url: string, extraHeaders?: Record<string, string>): Promise<string> {
  const res = await fetch(url, {
    headers: { ...HEADERS, ...extraHeaders },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

function isAdDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return AD_DOMAINS.some((ad) => hostname.includes(ad));
  } catch {
    return false;
  }
}

/**
 * Extract direct video URLs (MP4 / M3U8) from a page that embeds a video player.
 * Looks for JWPlayer, Plyr, Video.js, and raw <source> tags.
 */
async function resolveDirectVideoUrl(embedUrl: string): Promise<string[]> {
  if (isAdDomain(embedUrl)) return [];

  let html: string;
  try {
    html = await fetchPage(embedUrl, {
      Referer: BASE_URL,
      Origin: BASE_URL,
    });
  } catch {
    return [];
  }

  const found: string[] = [];

  // 1. Regex scan for raw video file URLs in script content
  const filePatterns = [
    // JWPlayer / generic: file: "https://...mp4"  or  file:"..."
    /['"](https?:\/\/[^'"]+\.(?:mp4|m3u8|mkv|webm|avi)[^'"]*)['"]/gi,
    // sources array: [{file:"..."}]
    /file\s*:\s*['"](https?:\/\/[^'"]+)['"]/gi,
    // hls / dash manifest
    /['"](https?:\/\/[^'"]*\.m3u8[^'"]*)['"]/gi,
  ];

  for (const pattern of filePatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      if (url && !found.includes(url) && !isAdDomain(url)) {
        found.push(url);
      }
    }
  }

  // 2. Cheerio scan for <source> and <video> tags
  const $ = cheerio.load(html);
  $("source[src], video[src]").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (src && !found.includes(src) && !isAdDomain(src)) {
      found.push(src);
    }
  });

  // 3. Check nested iframes (one level deep only)
  const nestedIframes: string[] = [];
  $("iframe[src]").each((_i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src && !isAdDomain(src)) nestedIframes.push(src);
  });

  for (const src of nestedIframes.slice(0, 3)) {
    const nested = await resolveDirectVideoUrl(src);
    for (const u of nested) {
      if (!found.includes(u)) found.push(u);
    }
  }

  return found;
}

export type ContentType = "film" | "anime" | "all";

export interface Movie {
  title: string;
  slug: string;
  poster: string;
  year: string;
  rating: string;
  genre: string[];
  quality: string;
  type: ContentType;
  url: string;
}

export interface MovieDetail extends Movie {
  synopsis: string;
  duration: string;
  country: string;
  director: string;
  cast: string[];
  streamUrls: string[];
}

export interface MoviesResult {
  movies: Movie[];
  totalPages: number;
  currentPage: number;
}

function extractSlugFromUrl(url: string): string {
  const clean = url.replace(/\/$/, "");
  return clean.split("/").pop() || clean;
}

function detectContentType(el: cheerio.Cheerio<cheerio.Element>, url: string): ContentType {
  const text = (el.text() + " " + url).toLowerCase();
  if (text.includes("anime")) return "anime";
  // WordPress movie themes often tag films with /film/ path
  if (text.includes("/film/") || text.includes("movie") || text.includes("film")) return "film";
  return "film"; // default to film on klikfilm
}

function parseMovieCard(
  $: cheerio.CheerioAPI,
  el: cheerio.Element,
  defaultType: ContentType = "film"
): Movie {
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
  const quality =
    $el.find(".quality, .qlty, [class*='quality'], [class*='qlty']").first().text().trim() || "";
  const rating =
    $el.find(".rating, .imdb, [class*='rating'], [class*='imdb']").first().text().trim() || "";
  const year =
    $el.find(".year, [class*='year'], .date").first().text().trim() || "";
  const genreText =
    $el.find(".genre, [class*='genre']").first().text().trim() || "";
  const genre = genreText
    ? genreText.split(/[,/|]/).map((g) => g.trim()).filter(Boolean)
    : [];

  const slug = extractSlugFromUrl(url);

  // Detect type from genre tags or URL path
  let type: ContentType = defaultType;
  const isAnime =
    genre.some((g) => g.toLowerCase().includes("anime")) ||
    url.includes("/anime/") ||
    url.includes("anime");
  if (isAnime) type = "anime";

  return { title, slug, poster, year, rating, genre, quality, type, url };
}

function buildUrl(type: ContentType, page: number, genre?: string, search?: string): string {
  if (search) {
    const base = `${BASE_URL}/?s=${encodeURIComponent(search)}`;
    return page > 1 ? `${base}&paged=${page}` : base;
  }

  if (genre) {
    const base = `${BASE_URL}/genre/${encodeURIComponent(genre)}/`;
    return page > 1 ? `${base}page/${page}/` : base;
  }

  // Type-based URL mapping for klikfilm.web.id
  if (type === "anime") {
    const base = `${BASE_URL}/category/anime/`;
    return page > 1 ? `${base}page/${page}/` : base;
  }

  if (type === "film") {
    // Most klikfilm setups serve films at homepage or /category/movie/
    const base = page > 1 ? `${BASE_URL}/page/${page}/` : BASE_URL;
    return base;
  }

  // "all" — homepage
  return page > 1 ? `${BASE_URL}/page/${page}/` : BASE_URL;
}

function parseTotalPages($: cheerio.CheerioAPI): number {
  const lastLink =
    $(".pagination a:last-child, .page-numbers a:last-child, nav.pagination a").last().attr("href") ||
    "";
  const m = lastLink.match(/\/page\/(\d+)/);
  if (m) return parseInt(m[1], 10);

  const nums = $(".page-numbers")
    .map((_i, el) => parseInt($<typeof el>(el).text().trim(), 10))
    .get()
    .filter((n: number) => !isNaN(n));
  return nums.length > 0 ? Math.max(...nums) : 1;
}

export async function scrapeMovies(
  page: number = 1,
  type: ContentType = "all",
  genre?: string,
  search?: string
): Promise<MoviesResult> {
  const url = buildUrl(type, page, genre, search);
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const movies: Movie[] = [];
  const defaultType: ContentType = type === "anime" ? "anime" : "film";

  const selectors = [
    ".movies-list article",
    ".film-list article",
    ".post-list article",
    "article.movies",
    ".item",
    ".movie-item",
    "article",
  ];

  for (const sel of selectors) {
    $(sel).each((_i, el) => {
      const movie = parseMovieCard($, el, defaultType);
      if (movie.title && movie.url) {
        // Filter by requested type
        if (type === "all" || movie.type === type) {
          if (!movies.find((m) => m.slug === movie.slug)) {
            movies.push(movie);
          }
        }
      }
    });
    if (movies.length > 0) break;
  }

  return { movies, totalPages: parseTotalPages($), currentPage: page };
}

export async function scrapeMovieDetail(
  slug: string,
  resolveVideo: boolean = true
): Promise<MovieDetail> {
  const url = `${BASE_URL}/${slug}/`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const title =
    $("h1.entry-title, h1.title, .film-title, h1").first().text().trim() || slug;
  const poster =
    $(".poster img, .film-poster img, .entry-thumbnail img, .wp-post-image")
      .first()
      .attr("src") ||
    $(".poster img, .film-poster img").first().attr("data-src") ||
    "";

  const synopsis =
    $(
      ".synopsis, .overview, .entry-content p, .film-synopsis, [class*='sinopsis']"
    )
      .first()
      .text()
      .trim() || "";

  function getMeta(labels: string[]): string {
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

  const year =
    getMeta(["Tahun", "Year", "Released"]) ||
    $("[class*='year']").first().text().trim() ||
    "";
  const duration =
    getMeta(["Durasi", "Duration", "Runtime"]) ||
    $("[class*='duration'], [class*='runtime']").first().text().trim() ||
    "";
  const country =
    getMeta(["Negara", "Country"]) ||
    $("[class*='country']").first().text().trim() ||
    "";
  const director =
    getMeta(["Sutradara", "Director"]) ||
    $("[class*='director']").first().text().trim() ||
    "";
  const quality =
    $(".quality, .qlty, [class*='quality']").first().text().trim() || "";
  const rating =
    $(".imdb, .rating, [class*='rating'], [class*='imdb']").first().text().trim() ||
    "";

  const cast: string[] = [];
  $("[class*='cast'] a, [class*='actor'] a, [class*='pemain'] a").each(
    (_i, el) => {
      const name = $(el).text().trim();
      if (name) cast.push(name);
    }
  );

  const genre: string[] = [];
  $("[class*='genre'] a, .genres a").each((_i, el) => {
    const g = $(el).text().trim();
    if (g) genre.push(g);
  });

  const type: ContentType = genre.some((g) => g.toLowerCase().includes("anime"))
    ? "anime"
    : "film";

  // Collect embed iframe URLs (skip known ad frames)
  const embedUrls: string[] = [];
  $("iframe").each((_i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src && !isAdDomain(src) && !embedUrls.includes(src)) {
      embedUrls.push(src);
    }
  });

  // Collect <source> / <video> src on the detail page itself
  const directOnPage: string[] = [];
  $("[class*='player'] source, [class*='video'] source, video source, video[src]").each(
    (_i, el) => {
      const src = $(el).attr("src") || "";
      if (src && !directOnPage.includes(src)) directOnPage.push(src);
    }
  );

  let streamUrls: string[] = [...directOnPage];

  if (resolveVideo) {
    // Resolve each embed URL into direct video URLs (no-ad)
    for (const embedUrl of embedUrls.slice(0, 5)) {
      const resolved = await resolveDirectVideoUrl(embedUrl);
      for (const u of resolved) {
        if (!streamUrls.includes(u)) streamUrls.push(u);
      }
    }

    // If no direct URL found, fall back to embed URLs (better than nothing)
    if (streamUrls.length === 0) {
      streamUrls = embedUrls;
    }
  } else {
    streamUrls = [...streamUrls, ...embedUrls];
  }

  const slug_ = extractSlugFromUrl(url);

  return {
    title,
    slug: slug_,
    poster,
    year,
    rating,
    genre,
    quality,
    type,
    url,
    synopsis,
    duration,
    country,
    director,
    cast,
    streamUrls,
  };
}

export async function scrapeGenres(): Promise<string[]> {
  const html = await fetchPage(BASE_URL);
  const $ = cheerio.load(html);

  const genres: string[] = [];
  $("[class*='genre'] a, .genre-list a, nav a[href*='/genre/']").each(
    (_i, el) => {
      const text = $(el).text().trim();
      if (text && !genres.includes(text)) {
        genres.push(text);
      }
    }
  );

  return genres;
}

/**
 * Scrape the latest films AND anime from page 1.
 * Used by the daily scheduler.
 */
export async function scrapeLatest(): Promise<{ films: Movie[]; anime: Movie[] }> {
  const [filmResult, animeResult] = await Promise.all([
    scrapeMovies(1, "film"),
    scrapeMovies(1, "anime"),
  ]);
  return {
    films: filmResult.movies,
    anime: animeResult.movies,
  };
}
