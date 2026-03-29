import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      
      <div className="text-center relative z-10 glass-panel p-12 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl">
        <AlertCircle className="w-20 h-20 text-primary mx-auto mb-6 opacity-80" />
        <h1 className="text-4xl font-display font-bold text-foreground mb-4">
          404
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Scene Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for seems to have been cut from the final edit.
        </p>
        
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-primary/20"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Homepage
        </Link>
      </div>
    </div>
  );
}
