import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Film, Search, Menu, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
  onSearch?: (term: string) => void;
  searchValue?: string;
}

export function Layout({ children, onSearch, searchValue }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchValue || "");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(localSearch);
    }
  };

  const isHome = location === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30 selection:text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 glass-panel transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-yellow-300 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
                <Film className="w-5 h-5 text-background" />
              </div>
              <span className="font-display font-bold text-2xl tracking-wide text-foreground">
                Cip<span className="text-primary">Film</span>
              </span>
            </Link>

            {/* Desktop Navigation & Search */}
            <div className="hidden md:flex flex-1 items-center justify-center max-w-xl px-8">
              {isHome && onSearch && (
                <form 
                  onSubmit={handleSearchSubmit}
                  className="relative w-full group"
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search movies, directors, actors..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full bg-secondary/50 hover:bg-secondary/80 focus:bg-secondary border border-transparent focus:border-primary/50 text-foreground rounded-full py-2.5 pl-12 pr-4 outline-none transition-all duration-300 placeholder:text-muted-foreground/70"
                  />
                </form>
              )}
            </div>

            {/* User Actions */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => alert("Authentication not implemented in this demo")}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-secondary"
              >
                Sign In
              </button>
              <button 
                onClick={() => alert("Subscription not implemented in this demo")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                Subscribe
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/5 bg-background/95 backdrop-blur-xl"
          >
            <div className="p-4 space-y-4">
              {isHome && onSearch && (
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search movies..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full bg-secondary text-foreground rounded-xl py-3 pl-12 pr-4 outline-none border border-transparent focus:border-primary/50"
                  />
                </form>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/50 font-medium hover:bg-secondary">
                  <User className="w-4 h-4" /> Sign In
                </button>
                <button className="flex items-center justify-center py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
                  Subscribe
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 w-full relative z-10 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-card/50 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 opacity-80">
              <Film className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-xl text-foreground">
                Cip<span className="text-primary">Film</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm text-center md:text-left">
              &copy; {new Date().getFullYear()} CipFilm. For educational purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
