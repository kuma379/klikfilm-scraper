import { useState, useCallback } from "react";

export function useMovieFilters() {
  const [page, setPage] = useState(1);
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string | undefined>(undefined);

  const handleSearch = useCallback((term: string) => {
    setSearch(term || undefined);
    setPage(1); // Reset page on new search
  }, []);

  const handleGenreSelect = useCallback((selectedGenre: string) => {
    setGenre(prev => prev === selectedGenre ? undefined : selectedGenre);
    setPage(1); // Reset page on new genre filter
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    page,
    genre,
    search,
    handleSearch,
    handleGenreSelect,
    handlePageChange
  };
}
