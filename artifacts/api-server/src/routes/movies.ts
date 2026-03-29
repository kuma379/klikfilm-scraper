import { Router, type IRouter } from "express";
import { scrapeMovies, scrapeMovieDetail, scrapeGenres } from "../lib/scraper.js";

const router: IRouter = Router();

router.get("/movies", async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const genre = (req.query.genre as string) || undefined;
    const search = (req.query.search as string) || undefined;

    const result = await scrapeMovies(page, genre, search);
    res.json(result);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to scrape movies");
    res.status(500).json({
      error: "SCRAPE_ERROR",
      message: err instanceof Error ? err.message : "Failed to scrape movies",
    });
  }
});

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

router.get("/movies/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const detail = await scrapeMovieDetail(slug);
    res.json(detail);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to scrape movie detail");
    res.status(500).json({
      error: "SCRAPE_ERROR",
      message: err instanceof Error ? err.message : "Failed to scrape movie detail",
    });
  }
});

export default router;
