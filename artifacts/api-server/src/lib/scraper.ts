import * as cheerio from "cheerio";

const BASE_URL = "https://klikfilm.web.id";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": BASE_URL,
};

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

export interface Movie {
  title: string;
  slug: string;
  poster: string;
  year: string;
  rating: string;
  genre: string[];
  quality: string;
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

function parseMovieCard($: cheerio.CheerioAPI, el: cheerio.Element): Movie {
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

  return { title, slug, poster, year, rating, genre, quality, url };
}

export async function scrapeMovies(
  page: number = 1,
  genre?: string,
  search?: string
): Promise<MoviesResult> {
  let url = BASE_URL;

  if (search) {
    url = `${BASE_URL}/?s=${encodeURIComponent(search)}`;
    if (page > 1) url += `&paged=${page}`;
  } else if (genre) {
    url = `${BASE_URL}/genre/${encodeURIComponent(genre)}/`;
    if (page > 1) url += `page/${page}/`;
  } else {
    if (page > 1) url = `${BASE_URL}/page/${page}/`;
  }

  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const movies: Movie[] = [];

  $(".movies-list article, .film-list article, .post-list article, article.movies").each(
    (_i, el) => {
      const movie = parseMovieCard($, el);
      if (movie.title && movie.url) {
        movies.push(movie);
      }
    }
  );

  if (movies.length === 0) {
    $(".item, .movie-item, [class*='item']").each((_i, el) => {
      const movie = parseMovieCard($, el);
      if (movie.title && movie.url) {
        movies.push(movie);
      }
    });
  }

  if (movies.length === 0) {
    $("article").each((_i, el) => {
      const movie = parseMovieCard($, el);
      if (movie.title && movie.url) {
        movies.push(movie);
      }
    });
  }

  let totalPages = 1;
  const lastPageLink =
    $(".pagination a:last-child, .page-numbers a:last-child, nav.pagination a").last().attr("href") || "";
  const pageMatch = lastPageLink.match(/\/page\/(\d+)/);
  if (pageMatch) {
    totalPages = parseInt(pageMatch[1], 10);
  } else {
    const pageNums = $(".page-numbers")
      .map((_i, el) => parseInt($(el).text().trim(), 10))
      .get()
      .filter((n) => !isNaN(n));
    if (pageNums.length > 0) {
      totalPages = Math.max(...pageNums);
    }
  }

  return { movies, totalPages, currentPage: page };
}

export async function scrapeMovieDetail(slug: string): Promise<MovieDetail> {
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
    $(".synopsis, .overview, .entry-content p, .film-synopsis, [class*='sinopsis']")
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

  const year = getMeta(["Tahun", "Year", "Released"]) ||
    $("[class*='year']").first().text().trim() || "";
  const duration = getMeta(["Durasi", "Duration", "Runtime"]) ||
    $("[class*='duration'], [class*='runtime']").first().text().trim() || "";
  const country = getMeta(["Negara", "Country"]) ||
    $("[class*='country']").first().text().trim() || "";
  const director = getMeta(["Sutradara", "Director"]) ||
    $("[class*='director']").first().text().trim() || "";
  const quality = $(".quality, .qlty, [class*='quality']").first().text().trim() || "";
  const rating =
    $(".imdb, .rating, [class*='rating'], [class*='imdb']").first().text().trim() || "";

  const cast: string[] = [];
  $("[class*='cast'] a, [class*='actor'] a, [class*='pemain'] a").each((_i, el) => {
    const name = $(el).text().trim();
    if (name) cast.push(name);
  });

  const genre: string[] = [];
  $("[class*='genre'] a, .genres a").each((_i, el) => {
    const g = $(el).text().trim();
    if (g) genre.push(g);
  });

  const streamUrls: string[] = [];
  $("iframe").each((_i, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src && !streamUrls.includes(src)) {
      streamUrls.push(src);
    }
  });

  $("[class*='player'] source, [class*='video'] source, video source").each((_i, el) => {
    const src = $(el).attr("src") || "";
    if (src && !streamUrls.includes(src)) {
      streamUrls.push(src);
    }
  });

  return {
    title,
    slug,
    poster,
    year,
    rating,
    genre,
    quality,
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
  $("[class*='genre'] a, .genre-list a, nav a[href*='/genre/']").each((_i, el) => {
    const text = $(el).text().trim();
    if (text && !genres.includes(text)) {
      genres.push(text);
    }
  });

  return genres;
}
