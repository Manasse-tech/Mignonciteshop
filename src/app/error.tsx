"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg bg-card border border-border/60 rounded-2xl shadow-sm p-8 sm:p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A961]/10">
          <AlertTriangle className="h-8 w-8 text-[#C9A961]" aria-hidden="true" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Une erreur est survenue
        </h1>
        <p className="text-muted-foreground mb-8 break-words">
          {error.message || "Une erreur inattendue s'est produite. Veuillez réessayer."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-[#C9A961] hover:bg-[#b8994f] text-white px-8 py-3 rounded-full font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-border px-8 py-3 rounded-full font-semibold hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
