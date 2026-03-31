import { Layout } from "@/components/Layout";
import { MovieCard, MovieCardSkeleton } from "@/components/movie/MovieCard";
import { Pagination } from "@/components/movie/Pagination";
import { useMovieFilters, type ContentType } from "@/hooks/use-movie-filters";
import { useGetMovies, useGetGenres } from "@workspace/api-client-react";
import { Film, Filter, LayoutGrid, Tv2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TYPE_TABS: { label: string; value: ContentType; icon: React.ReactNode }[] = [
  { label: "Semua", value: "all", icon: <LayoutGrid className="w-4 h-4" /> },
  { label: "Film", value: "film", icon: <Film className="w-4 h-4" /> },
  { label: "Anime", value: "anime", icon: <Tv2 className="w-4 h-4" /> },
];

export default function Home() {
  const {
    page,
    type,
    genre,
    search,
    handleSearch,
    handleTypeChange,
    handleGenreSelect,
    handlePageChange,
  } = useMovieFilters();

  const { data: moviesData, isLoading: isLoadingMovies, isError } = useGetMovies({
    page,
    type,
    genre,
    search,
  });

  const { data: genresData } = useGetGenres();

  return (
    <Layout onSearch={handleSearch} searchValue={search}>
      {/* Hero Banner */}
      {!search && !genre && page === 1 && type === "all" && (
        <section className="relative w-full h-[50vh] min-h-[380px] flex items-center justify-center overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/80 to-primary/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white drop-shadow-xl"
            >
              Film &amp; Anime <br />
              <span className="text-primary">Terbaru</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-medium"
            >
              Streaming ribuan film dan anime pilihan. Konten diperbarui otomatis setiap hari.
            </motion.p>
          </div>
        </section>
      )}

      {/* Type Tabs (Film / Anime / All) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex gap-2">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTypeChange(tab.value)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border",
                type === tab.value
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_-5px] shadow-primary/50"
                  : "bg-secondary/60 text-muted-foreground border-white/5 hover:bg-secondary hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0">
          <div className="sticky top-28 glass-panel p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-4 text-foreground font-display font-semibold">
              <Filter className="w-4 h-4 text-primary" />
              Genre
            </div>
            <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
              <button
                onClick={() => handleGenreSelect("")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  !genre
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                )}
              >
                Semua Genre
              </button>
              {genresData?.genres.map((g) => (
                <button
                  key={g}
                  onClick={() => handleGenreSelect(g)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    genre === g
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Movie Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              {search ? (
                <>
                  Hasil untuk <span className="text-primary">"{search}"</span>
                </>
              ) : genre ? (
                <>{genre}</>
              ) : type === "anime" ? (
                <>
                  <Tv2 className="w-5 h-5 text-primary" /> Anime Terbaru
                </>
              ) : type === "film" ? (
                <>
                  <Film className="w-5 h-5 text-primary" /> Film Terbaru
                </>
              ) : (
                <>
                  <LayoutGrid className="w-5 h-5 text-primary" /> Trending Sekarang
                </>
              )}
            </h2>
            {moviesData && !isLoadingMovies && (
              <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-white/5">
                Hal. {moviesData.currentPage} / {moviesData.totalPages}
              </span>
            )}
          </div>

          {isLoadingMovies ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 15 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-card rounded-3xl border border-destructive/20">
              <Film className="w-14 h-14 text-destructive/50 mb-4" />
              <h3 className="text-xl font-bold">Gagal memuat konten</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Terjadi kesalahan saat mengambil data.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : moviesData?.movies.length === 0 ? (
            <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-card rounded-3xl border border-white/5">
              <Search className="w-14 h-14 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold">Tidak ada konten</h3>
              <p className="text-muted-foreground mt-2 mb-6">
                Coba ubah filter atau kata kunci pencarian.
              </p>
              <button
                onClick={() => {
                  handleSearch("");
                  handleGenreSelect("");
                  handleTypeChange("all");
                }}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {moviesData?.movies.map((movie, index) => (
                  <MovieCard key={movie.slug} movie={movie} index={index} />
                ))}
              </div>
              {moviesData && (
                <Pagination
                  currentPage={moviesData.currentPage}
                  totalPages={moviesData.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
