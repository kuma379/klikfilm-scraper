import { Link } from "wouter";
import { Star, PlayCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { Movie } from "@workspace/api-client-react/src/generated/api.schemas";

interface MovieCardProps {
  movie: Movie;
  index: number;
}

export function MovieCard({ movie, index }: MovieCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link 
        href={`/movie/${movie.slug}`}
        className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-white/5 hover:border-primary/30 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {/* Poster Image Container */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-secondary">
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
          
          {/* Quality Badge */}
          {movie.quality && (
            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-primary tracking-wider">
              {movie.quality}
            </div>
          )}

          {/* Rating Badge */}
          {movie.rating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-white">
              <Star className="w-3 h-3 text-primary fill-primary" />
              {movie.rating}
            </div>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg shadow-primary/50">
              <PlayCircle className="w-8 h-8 ml-1" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 z-10 -mt-12">
          <h3 className="font-display font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {movie.title}
          </h3>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {movie.year && (
              <span className="font-medium bg-white/10 px-2 py-0.5 rounded text-white/90">
                {movie.year}
              </span>
            )}
            {movie.genre && movie.genre.length > 0 && (
              <span className="line-clamp-1 flex-1">
                {movie.genre.join(" • ")}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-card border border-white/5 animate-pulse">
      <div className="aspect-[2/3] w-full bg-secondary/50" />
      <div className="p-4">
        <div className="h-5 bg-secondary/80 rounded w-3/4 mb-3" />
        <div className="h-4 bg-secondary/60 rounded w-1/2" />
      </div>
    </div>
  );
}
