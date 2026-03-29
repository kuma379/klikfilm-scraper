import { Router, type IRouter } from "express";
import {
  scrapeMovies,
  scrapeMovieDetail,
  scrapeGenres,
  type ContentType,
} from "../lib/scraper.js";

const router: IRouter = Router();

// GET /api/movies?page=1&type=film|anime|all&genre=Action&search=keyword
router.get("/movies", async (req, res) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const rawType = ((req.query.type as string) || "all").toLowerCase();
    const type: ContentType =
      rawType === "film" ? "film" : rawType === "anime" ? "anime" : "all";
    const genre = (req.query.genre as string) || undefined;
    const search = (req.query.search as string) || undefined;

    const result = await scrapeMovies(page, type, genre, search);
    res.json(result);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to scrape movies");
    res.status(500).json({
      error: "SCRAPE_ERROR",
      message: err instanceof Error ? err.message : "Failed to scrape movies",
    });
  }
});

// GET /api/genres
router.get("/genres", async (req, res) => {
  try {
    const genres = await scrapeGenres();
    res.json({ genres });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to scrape genres");
    res.status(500).json({
      error: "SCRAPE_ERROR",
      message: err instanceof Error ? err.message : "Failed to scrape genres",
    });
  }
});

// GET /api/movies/:slug?resolveVideo=true
router.get("/movies/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const resolveVideo = (req.query.resolveVideo as string) !== "false";
    const detail = await scrapeMovieDetail(slug, resolveVideo);
    res.json(detail);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to scrape movie detail");
    res.status(500).json({
      error: "SCRAPE_ERROR",
      message:
        err instanceof Error ? err.message : "Failed to scrape movie detail",
    });
  }
});

export default router;
