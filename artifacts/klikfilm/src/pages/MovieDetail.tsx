import { useParams, useLocation } from "wouter";
import { useGetMovieDetail } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import {
  Play,
  Share2,
  Star,
  Clock,
  Globe2,
  AlertCircle,
  ArrowLeft,
  Tv2,
  Film,
  Loader2,
  Server,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function MovieDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const slug = params.slug as string;
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [activeServer, setActiveServer] = useState(0);

  const { data: movie, isLoading, isError } = useGetMovieDetail(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="w-full h-screen animate-pulse bg-background">
          <div className="w-full h-[60vh] bg-secondary/30 relative">
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 flex gap-8">
            <div className="w-64 aspect-[2/3] rounded-2xl bg-secondary/50 shrink-0" />
            <div className="flex-1 pt-12 space-y-4">
              <div className="h-10 w-2/3 bg-secondary/50 rounded-xl" />
              <div className="h-4 w-1/3 bg-secondary/40 rounded" />
              <div className="h-32 w-full bg-secondary/30 rounded-xl mt-8" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !movie) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh]">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Tidak Ditemukan</h2>
          <p className="text-muted-foreground mb-6">
            Film / anime yang kamu cari tidak tersedia.
          </p>
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        </div>
      </Layout>
    );
  }

  const isAnime = movie.type === "anime";

  // Build player source list
  // servers from RSC have decoded URLs (Blogger, Mega, pixeldrain, etc.)
  const serverList: Array<{ name: string; url: string }> = movie.servers && movie.servers.length > 0
    ? movie.servers
    : movie.streamUrls && movie.streamUrls.length > 0
      ? movie.streamUrls.map((u: string, i: number) => ({ name: `Server ${i + 1}`, url: u }))
      : movie.url
        ? [{ name: "Server 1", url: movie.url }]
        : [];

  const currentUrl = serverList[activeServer]?.url || "";

  const openPlayer = (idx: number = 0) => {
    setActiveServer(idx);
    setPlayerOpen(true);
    setPlayerLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Layout>
      {/* Cinematic Hero Backdrop */}
      <div className="relative w-full h-[60vh] min-h-[500px] md:h-[70vh]">
        <div className="absolute inset-0 z-0">
          {movie.poster && (
            <img
              src={movie.poster}
              alt="Backdrop"
              className="w-full h-full object-cover opacity-30 blur-sm scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
        </div>

        <div className="absolute inset-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12">
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-end md:items-start">
              {/* Poster */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-48 sm:w-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 md:-mb-24 relative group"
              >
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-secondary/50 flex items-center justify-center">
                    {isAnime ? (
                      <Tv2 className="w-16 h-16 text-muted-foreground/30" />
                    ) : (
                      <Film className="w-16 h-16 text-muted-foreground/30" />
                    )}
                  </div>
                )}
                {movie.quality && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-primary tracking-wider">
                    {movie.quality}
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold">
                  {isAnime ? (
                    <Tv2 className="w-3 h-3 text-blue-400" />
                  ) : (
                    <Film className="w-3 h-3 text-primary" />
                  )}
                  <span className={isAnime ? "text-blue-400" : "text-primary"}>
                    {isAnime ? "Anime" : "Film"}
                  </span>
                </div>
              </motion.div>

              {/* Title & Meta */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex-1 pb-4 md:pb-0"
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {movie.year && (
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-md">
                      {movie.year}
                    </span>
                  )}
                  {movie.rating && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-md">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      {movie.rating}
                    </span>
                  )}
                  {movie.duration && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-md">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {movie.duration}
                    </span>
                  )}
                  {movie.country && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-md">
                      <Globe2 className="w-4 h-4 text-muted-foreground" />
                      {movie.country}
                    </span>
                  )}
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white mb-6 tracking-tight drop-shadow-lg">
                  {movie.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <button
                    onClick={() => openPlayer(0)}
                    className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full shadow-[0_0_40px_-10px] shadow-primary/50 hover:shadow-primary/80 hover:-translate-y-1 transition-all duration-300"
                  >
                    <Play className="w-5 h-5 fill-current" /> Tonton Sekarang
                  </button>
                  <button
                    onClick={() =>
                      navigator.clipboard
                        .writeText(window.location.href)
                        .then(() => alert("Link disalin!"))
                    }
                    className="p-4 bg-secondary/80 backdrop-blur-md hover:bg-secondary text-foreground rounded-full border border-white/5 transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <Share2 className="w-5 h-5 group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Video Player */}
      {playerOpen && currentUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 w-full"
        >
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
            {playerLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-muted-foreground text-sm">Memuat video...</p>
                </div>
              </div>
            )}
            <iframe
              key={currentUrl}
              src={currentUrl}
              title={movie.title}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media"
              onLoad={() => setPlayerLoading(false)}
            />
          </div>

          {/* Server selector */}
          {serverList.length > 1 && (
            <div className="mt-4 p-4 rounded-xl bg-secondary/40 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Pilih Server
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {serverList.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveServer(i);
                      setPlayerLoading(true);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeServer === i
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-white/5"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end mt-3">
            <button
              onClick={() => setPlayerOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Tutup Player
            </button>
          </div>
        </motion.div>
      )}

      {/* Details Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          {/* Left: Synopsis */}
          <div className="flex-1 space-y-10">
            {movie.synopsis && (
              <section>
                <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  Sinopsis
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {movie.synopsis}
                </p>
              </section>
            )}

            {movie.director && (
              <section>
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                  Sutradara
                </h3>
                <p className="text-primary font-medium">{movie.director}</p>
              </section>
            )}

            {movie.genre && movie.genre.length > 0 && (
              <section>
                <h3 className="text-lg font-display font-semibold text-foreground mb-3">
                  Genre
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genre.map((g: string) => (
                    <span
                      key={g}
                      className="px-4 py-2 rounded-lg bg-secondary border border-white/5 text-sm font-medium hover:border-primary/50 transition-colors"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Actions + Cast */}
          <div className="w-full lg:w-[350px] space-y-10">
            {/* Watch section — no source name shown */}
            {serverList.length > 0 && (
              <section className="glass-panel p-6 rounded-2xl border border-primary/20 bg-primary/5">
                <h3 className="text-xl font-display font-bold mb-1 text-primary flex items-center gap-2">
                  <Play className="w-5 h-5" /> Tonton
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {serverList.length} server tersedia
                </p>
                <div className="flex flex-col gap-2">
                  {serverList.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => openPlayer(i)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/10 hover:bg-primary text-foreground hover:text-primary-foreground transition-all font-semibold text-sm border border-primary/20 hover:border-primary group"
                    >
                      <span>{s.name}</span>
                      <Play className="w-4 h-4 fill-current opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {movie.cast && movie.cast.length > 0 && (
              <section className="glass-panel p-6 rounded-2xl">
                <h3 className="text-xl font-display font-bold mb-4">Pemeran</h3>
                <ul className="space-y-3">
                  {movie.cast.map((actor: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-white/5">
                        <span className="text-sm font-bold text-muted-foreground">
                          {actor.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-foreground">{actor}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
