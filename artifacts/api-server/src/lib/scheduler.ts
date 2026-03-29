import { logger } from "./logger.js";
import { scrapeLatest } from "./scraper.js";

let lastRunAt: Date | null = null;
let lastRunResult: { films: number; anime: number } | null = null;
let isRunning = false;

export function getSchedulerStatus() {
  return {
    lastRunAt: lastRunAt?.toISOString() ?? null,
    lastRunResult,
    isRunning,
    nextRunAt: getNextMidnight().toISOString(),
  };
}

function getNextMidnight(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

async function runDailyScrape() {
  if (isRunning) {
    logger.warn("Daily scrape already running, skipping");
    return;
  }

  isRunning = true;
  logger.info("Daily scrape started");

  try {
    const { films, anime } = await scrapeLatest();
    lastRunAt = new Date();
    lastRunResult = { films: films.length, anime: anime.length };
    logger.info(
      { films: films.length, anime: anime.length },
      "Daily scrape completed"
    );
  } catch (err) {
    logger.error({ err }, "Daily scrape failed");
  } finally {
    isRunning = false;
  }
}

function scheduleNextRun() {
  const now = Date.now();
  const next = getNextMidnight().getTime();
  const delay = next - now;

  logger.info(
    { nextRunAt: new Date(next).toISOString(), delayMs: delay },
    "Scheduled next daily scrape"
  );

  setTimeout(async () => {
    await runDailyScrape();
    scheduleNextRun(); // schedule the following day
  }, delay);
}

export function startScheduler() {
  logger.info("Scraper scheduler initializing (daily at midnight WIB)");
  scheduleNextRun();
  // Run once on startup to populate fresh data
  runDailyScrape().catch((err) =>
    logger.error({ err }, "Initial scrape failed")
  );
}
