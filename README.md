# KlikFilm Scraper

Web scraper otomatis untuk **film** dan **anime** dari [klikfilm.web.id](https://klikfilm.web.id) dengan tampilan web modern.

## Fitur

- ✅ **Scrape Film & Anime** — filter konten berdasarkan tipe (film / anime / semua)
- ✅ **Video Tanpa Iklan** — ekstrak URL video langsung (MP4/M3U8) dari embed player, melewati redirect iklan
- ✅ **Update Otomatis Harian** — scheduler berjalan setiap tengah malam untuk mengambil konten terbaru
- ✅ **Pencarian & Filter Genre** — cari berdasarkan judul atau genre
- ✅ **Tampilan Modern** — UI React + Tailwind CSS dark mode

## Teknologi

| Bagian | Teknologi |
|--------|-----------|
| Backend | Node.js + Express 5 + TypeScript |
| Scraper | Native `fetch` + Cheerio (HTML parser) |
| Frontend | React + Vite + Tailwind CSS |
| API | OpenAPI 3.1 + Orval codegen |
| Database | PostgreSQL + Drizzle ORM |

## Cara Kerja Scraper

### Filter Film & Anime

Scraper membedakan film dan anime berdasarkan:
- URL path (`/category/anime/` → anime)
- Tag genre pada kartu konten
- Fallback ke `film` untuk konten lainnya

### Video Tanpa Iklan

Proses ekstraksi URL video langsung:

1. Ambil semua `<iframe>` dari halaman detail
2. Filter dan skip iframe dari domain iklan yang dikenal (popads, adsterra, dll.)
3. Muat setiap halaman embed dan cari pola URL video:
   - JWPlayer: `file: "https://...mp4"`
   - HLS manifest: `https://....m3u8`
   - `<source src="...">` / `<video src="...">`
4. Kembalikan URL video langsung tanpa redirect iklan

### Scheduler Harian

- Berjalan sekali saat server startup (warmup)
- Dijadwalkan ulang setiap tengah malam
- Status dapat dicek via `GET /api/scraper/status`

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/movies` | Daftar film/anime. Query: `page`, `type` (film/anime/all), `genre`, `search` |
| GET | `/api/movies/:slug` | Detail + URL video langsung. Query: `resolveVideo` (true/false) |
| GET | `/api/genres` | Daftar genre |
| GET | `/api/scraper/status` | Status scheduler harian |
| GET | `/api/healthz` | Health check |

## Struktur Proyek

```
├── artifacts/
│   ├── api-server/          # Express API + scraper
│   │   └── src/lib/
│   │       ├── scraper.ts   # Logika scraping & ekstraksi video
│   │       └── scheduler.ts # Scheduler harian
│   └── klikfilm/            # Frontend React
│       └── src/pages/
│           ├── Home.tsx     # Halaman utama (film/anime tabs)
│           └── MovieDetail.tsx
├── lib/
│   ├── api-spec/openapi.yaml # Kontrak API
│   ├── api-client-react/    # Generated React Query hooks
│   └── api-zod/             # Generated Zod schemas
```

## Menjalankan Secara Lokal

```bash
pnpm install

# API server
pnpm --filter @workspace/api-server run dev

# Frontend
pnpm --filter @workspace/klikfilm run dev
```

## Deploy ke Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kuma379/klikfilm-scraper)

## Lisensi

MIT
