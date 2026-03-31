import axios from "axios";

const BASE_URL = "https://klikfilm.web.id";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.5",
  Referer: BASE_URL,
};

const RSC_HEADERS: Record<string, string> = {
  ...HEADERS,
  RSC: "1",
  Accept: "text/x-component",
  "Next-Router-Prefetch": "1",
};

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: HEADERS,
});

const httpRsc = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: RSC_HEADERS,
  responseType: "text",
});

/**
 * klikfilm.web.id is a Next.js App Router site using RSC (React Server Components).
 * Content is embedded in self.__next_f.push([1, "..."]) script tags.
 * We extract and decode these to parse movie/anime data.
 */
function extractRscContent(html: string): string {
  const pushes =
    html.match(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g) || [];
  let combined = "";
  for (const push of pushes) {
    const m = push.match(/\[1,"((?:[^"\\]|\\.)*)"\]/);
    if (m) {
      combined += m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\\\/g, "\\")
        .replace(/\\"/g, '"');
    }
  }
  return combined;
}

/**
 * Decode klikfilm's double-base64 encoded video URLs.
 * Video URLs are encoded as: base64(base64(realUrl))
 * This matches the decode function in klikfilm's player JS bundle.
 */
function decodeVideoUrl(encoded: string): string {
  if (!encoded) return "";
  try {
    if (!encoded.startsWith("http")) {
      const first = Buffer.from(encoded, "base64").toString("utf-8");
      return Buffer.from(first, "base64").toString("utf-8");
    }
  } catch {}
  return encoded;
}

/**
 * Decode the double-base64 encoded image proxy URL for anime thumbnails.
 * Format: /api/image-proxy?url=<base64(<base64(realUrl)>)>
 */
function decodeImageProxy(encoded: string): string {
  return decodeVideoUrl(encoded);
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
  servers: Array<{ name: string; url: string }>;
}

export interface MoviesResult {
  movies: Movie[];
  totalPages: number;
  currentPage: number;
}

/**
 * Parse anime cards from the RSC content of the /anime page.
 * Each anime card: href="/anime/watch/{slug}" + alt="{title}" + image-proxy URL
 */
function parseAnimeCards(rsc: string): Movie[] {
  const movies: Movie[] = [];
  const seen = new Set<string>();

  const pattern =
    /href":"(\/anime\/watch\/[a-z0-9-]+)"[^}]{1,1200}?image-proxy\?url=([A-Za-z0-9+/=]+)/g;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(rsc)) !== null) {
    const href = m[1];
    const imgEncoded = m[2];
    if (seen.has(href)) continue;
    seen.add(href);

    const slug = href.split("/").pop() || href;
    const surrounding = rsc.slice(
      Math.max(0, m.index - 50),
      m.index + m[0].length + 300
    );
    const altMatch = surrounding.match(/"alt":"([^"]{3,120})"/);
    const title = altMatch
      ? altMatch[1]
      : slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    const poster = decodeImageProxy(imgEncoded);

    movies.push({
      title,
      slug: `anime~${slug}`,
      poster,
      year: "",
      rating: "",
      genre: ["Anime"],
      quality: "",
      type: "anime",
      url: `${BASE_URL}${href}`,
    });
  }

  return movies;
}

/**
 * Parse movie cards from the RSC content of the /movie page.
 * Each movie card: href="/movie/detail/{slug-id}" + alt="{title}" + direct CDN img src
 */
function parseMovieCards(rsc: string): Movie[] {
  const movies: Movie[] = [];
  const seen = new Set<string>();

  const pattern =
    /href":"(\/movie\/detail\/[^"]+)"[^}]{1,1200}?"alt":"([^"]{2,120})"/g;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(rsc)) !== null) {
    const href = m[1];
    const title = m[2];
    if (seen.has(href)) continue;
    seen.add(href);

    const slug = href.split("/").pop() || href;
    const surrounding = rsc.slice(m.index, m.index + m[0].length + 500);
    const srcMatch = surrounding.match(
      /"src":"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/
    );
    const poster = srcMatch ? srcMatch[1] : "";

    movies.push({
      title,
      slug: `film~${slug}`,
      poster,
      year: "",
      rating: "",
      genre: ["Film"],
      quality: "",
      type: "film",
      url: `${BASE_URL}${href}`,
    });
  }

  return movies;
}

export async function scrapeMovies(
  page: number = 1,
  type: ContentType = "all",
  _genre?: string,
  search?: string
): Promise<MoviesResult> {
  const results: Movie[] = [];

  // No traditional pagination on klikfilm - return empty for page > 1
  if (page > 1) return { movies: [], totalPages: 1, currentPage: page };

  const fetchAnime = type === "all" || type === "anime";
  const fetchFilm = type === "all" || type === "film";

  if (search) {
    const [animeRes, movieRes] = await Promise.allSettled([
      fetchAnime
        ? httpRsc.get(`/anime/search?q=${encodeURIComponent(search)}`)
        : Promise.resolve(null),
      fetchFilm
        ? httpRsc.get(`/movie/search?q=${encodeURIComponent(search)}`)
        : Promise.resolve(null),
    ]);

    if (fetchAnime && animeRes.status === "fulfilled" && animeRes.value) {
      results.push(...parseAnimeCards(animeRes.value.data as string));
    }
    if (fetchFilm && movieRes.status === "fulfilled" && movieRes.value) {
      results.push(...parseMovieCards(movieRes.value.data as string));
    }
    return { movies: results, totalPages: 1, currentPage: 1 };
  }

  const [animeRes, movieRes] = await Promise.allSettled([
    fetchAnime ? http.get("/anime") : Promise.resolve(null),
    fetchFilm ? http.get("/movie") : Promise.resolve(null),
  ]);

  if (fetchAnime && animeRes.status === "fulfilled" && animeRes.value) {
    const rsc = extractRscContent(animeRes.value.data as string);
    results.push(...parseAnimeCards(rsc));
  }

  if (fetchFilm && movieRes.status === "fulfilled" && movieRes.value) {
    const rsc = extractRscContent(movieRes.value.data as string);
    results.push(...parseMovieCards(rsc));
  }

  return { movies: results, totalPages: 1, currentPage: 1 };
}

/**
 * Extract video player data (initialIframe + initialServers) from the RSC stream.
 * Uses RSC: 1 header to get the structured RSC payload directly.
 *
 * klikfilm encodes video URLs with double-base64:
 *   actual_url = atob(atob(encoded_value))
 *
 * This is extracted from klikfilm's player JS bundle (module 42860).
 */
async function extractVideoFromRsc(watchUrl: string): Promise<{
  initialIframe: string;
  servers: Array<{ name: string; url: string }>;
}> {
  const empty = { initialIframe: "", servers: [] };
  try {
    const res = await httpRsc.get(watchUrl.replace(BASE_URL, ""));
    const rsc: string = res.data;

    // Extract initialIframe
    const iframeMatch = rsc.match(/"initialIframe":"([^"]+)"/);
    const rawIframe = iframeMatch ? iframeMatch[1] : "";
    const initialIframe = rawIframe ? decodeVideoUrl(rawIframe) : "";

    // Extract initialServers
    const serverMatch = rsc.match(/"initialServers":\[([^\]]+)\]/);
    const servers: Array<{ name: string; url: string }> = [];
    if (serverMatch) {
      const serverJson = `[${serverMatch[1]}]`;
      try {
        const rawServers = JSON.parse(serverJson) as Array<{
          name: string;
          url: string;
        }>;
        for (const s of rawServers) {
          const decodedUrl = decodeVideoUrl(s.url);
          if (decodedUrl) {
            servers.push({ name: s.name, url: decodedUrl });
          }
        }
      } catch {}
    }

    return { initialIframe, servers };
  } catch {
    return empty;
  }
}

/**
 * Build the klikfilm watch URL from an encoded slug.
 *   "anime~ikoku-nikki"       → https://klikfilm.web.id/anime/watch/ikoku-nikki
 *   "film~goat-u1jZhR4CnV4"  → https://klikfilm.web.id/movie/detail/goat-u1jZhR4CnV4
 */
function buildWatchUrl(slugOrUrl: string): string {
  if (slugOrUrl.startsWith("http")) return slugOrUrl;
  if (slugOrUrl.startsWith("anime~"))
    return `${BASE_URL}/anime/watch/${slugOrUrl.slice(6)}`;
  if (slugOrUrl.startsWith("film~"))
    return `${BASE_URL}/movie/detail/${slugOrUrl.slice(5)}`;
  // Legacy fallback
  const isMovie = /[A-Z]/.test(slugOrUrl.split("-").pop() || "");
  return isMovie
    ? `${BASE_URL}/movie/detail/${slugOrUrl}`
    : `${BASE_URL}/anime/watch/${slugOrUrl}`;
}

/**
 * Scrape the detail page for a movie or anime.
 * Uses axios + RSC: 1 header to extract structured data including video URLs.
 */
export async function scrapeMovieDetail(
  slugOrUrl: string
): Promise<MovieDetail> {
  const watchUrl = buildWatchUrl(slugOrUrl);
  const isAnime = watchUrl.includes("/anime/");

  // Fetch HTML for title and poster
  const [htmlRes, videoData] = await Promise.allSettled([
    http.get(watchUrl.replace(BASE_URL, "")),
    extractVideoFromRsc(watchUrl),
  ]);

  let title = "";
  let poster = "";
  let synopsis = "";
  const rsc =
    htmlRes.status === "fulfilled"
      ? extractRscContent(htmlRes.value.data as string)
      : "";

  // Extract title from RSC h1 or page <title>
  const titleMatch = rsc.match(/"h1",null,\{"[^}]*"children":\["([^"]{2,120})"/);
  if (titleMatch) title = titleMatch[1];
  if (!title && htmlRes.status === "fulfilled") {
    const rawHtml = htmlRes.value.data as string;
    const metaTitle = rawHtml.match(/<title>([^<]{3,100}) (?:Sub Indo|Subtitle|Episode|–)/);
    if (metaTitle) title = metaTitle[1];
  }
  if (!title) {
    const pathSeg = watchUrl.split("/").pop() || slugOrUrl;
    title = pathSeg
      .replace(/-[A-Za-z0-9]{8,}$/, "")
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Extract poster from RSC
  const imgProxyMatch = rsc.match(/image-proxy\?url=([A-Za-z0-9+/=]+)/);
  if (imgProxyMatch) {
    poster = decodeImageProxy(imgProxyMatch[1]);
  }
  if (!poster) {
    const directImg = rsc.match(
      /"src":"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/
    );
    if (directImg) poster = directImg[1];
  }

  // Extract synopsis (if available)
  const synMatch = rsc.match(/"p",null,\{"className":"[^"]*","children":"([^"]{20,500})"/);
  if (synMatch) synopsis = synMatch[1];

  // Build stream URLs from video data
  const { initialIframe, servers } =
    videoData.status === "fulfilled"
      ? videoData.value
      : { initialIframe: "", servers: [] };

  // Collect all stream URLs: primary iframe + server alternatives
  const streamUrls: string[] = [];
  if (initialIframe) streamUrls.push(initialIframe);
  for (const s of servers) {
    if (s.url && !streamUrls.includes(s.url)) streamUrls.push(s.url);
  }

  const slug = watchUrl.split("/").pop() || slugOrUrl;
  const type: ContentType = isAnime ? "anime" : "film";

  return {
    title,
    slug,
    poster,
    year: "",
    rating: "",
    genre: isAnime ? ["Anime"] : ["Film"],
    quality: "",
    type,
    url: watchUrl,
    synopsis,
    duration: "",
    country: "",
    director: "",
    cast: [],
    streamUrls,
    servers,
  };
}

export async function scrapeGenres(): Promise<string[]> {
  return [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
  ];
}

/**
 * Scrape the latest films AND anime. Used by the daily scheduler.
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
