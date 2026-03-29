import { useState, useCallback } from "react";

export type ContentType = "all" | "film" | "anime";

export function useMovieFilters() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<ContentType>("all");
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string | undefined>(undefined);

  const handleSearch = useCallback((term: string) => {
    setSearch(term || undefined);
    setPage(1);
  }, []);

  const handleTypeChange = useCallback((newType: ContentType) => {
    setType(newType);
    setGenre(undefined);
    setPage(1);
  }, []);

  const handleGenreSelect = useCallback((selectedGenre: string) => {
    setGenre((prev) => (prev === selectedGenre ? undefined : selectedGenre));
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    page,
    type,
    genre,
    search,
    handleSearch,
    handleTypeChange,
    handleGenreSelect,
    handlePageChange,
  };
}
