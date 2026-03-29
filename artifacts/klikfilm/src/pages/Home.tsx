 import { Layout } from "@/components/Layout";
import { MovieCard, MovieCardSkeleton } from "@/components/movie/MovieCard";
import { Pagination } from "@/components/movie/Pagination";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { useGetMovies, useGetGenres } from "@workspace/api-client-react";
import { Film, Filter, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Home() {
  const { page, genre, search, handleSearch, handleGenreSelect, handlePageChange } = useMovieFilters();
  
  const { data: moviesData, isLoading: isLoadingMovies, isError } = useGetMovies({ 
    page, 
    genre, 
    search 
  });
  
  const { data: genresData } = useGetGenres();

  return (
    <Layout onSearch={handleSearch} searchValue={search}>
      {/* Hero Banner Area (Only visible when no search/filters) */}
      {!search && !genre && page === 1 && (
        <section className="relative w-full h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 z-0">
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
              alt="Cinematic background"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
          </div>
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white drop-shadow-xl"
            >
              Discover Cinematic <br/>
              <span className="text-gradient-primary">Masterpieces</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-medium"
            >
              Stream thousands of critically acclaimed movies, exclusive originals, and timeless classics in stunning high quality.
            </motion.p>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div className="sticky top-28 glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6 text-foreground font-display font-semibold text-lg">
              <Filter className="w-5 h-5 text-primary" />
              Categories
            </div>
            
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <button
                onClick={() => handleGenreSelect("")}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  !genre 
                    ? "bg-primary/20 text-primary border border-primary/30" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                )}
              >
                All Movies
              </button>
              
              {genresData?.genres.map((g) => (
                <button
                  key={g}
                  onClick={() => handleGenreSelect(g)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
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
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold flex items-center gap-3">
              {search ? (
                <>Search Results for <span className="text-primary">"{search}"</span></>
              ) : genre ? (
                <>{genre} Movies</>
              ) : (
                <>
                  <LayoutGrid className="w-6 h-6 text-primary" />
                  Trending Now
                </>
              )}
            </h2>
            
            {moviesData && !isLoadingMovies && (
              <span className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-white/5">
                Page {moviesData.currentPage} of {moviesData.totalPages}
              </span>
            )}
          </div>

          {/* Grid Content */}
          {isLoadingMovies ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 15 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-card rounded-3xl border border-destructive/20">
              <Film className="w-16 h-16 text-destructive/50 mb-4" />
              <h3 className="text-xl font-bold text-foreground">Failed to load movies</h3>
              <p className="text-muted-foreground mt-2 mb-6">Something went wrong while fetching the catalog.</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : moviesData?.movies.length === 0 ? (
            <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-card rounded-3xl border border-white/5">
              <Search className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold text-foreground">No movies found</h3>
              <p className="text-muted-foreground mt-2 mb-6">Try adjusting your search or category filters.</p>
              <button 
                onClick={() => { handleSearch(""); handleGenreSelect(""); }}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
