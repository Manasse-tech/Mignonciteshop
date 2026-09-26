"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, PackageSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TrackingPageProps {
  /** Optionnel : navigation SPA de l'orchestrateur (fallback : routeur interne). */
  onNavigate?: (page: string) => void;
}

type StepState = "done" | "current" | "pending";

const STEPS: { label: string; description: string; state: StepState }[] = [
  {
    label: "Commande confirmée",
    description: "Votre commande a été validée et votre paiement accepté.",
    state: "done",
  },
  {
    label: "En préparation",
    description: "Votre colis est en cours de préparation dans notre entrepôt.",
    state: "current",
  },
  {
    label: "Expédiée",
    description: "Votre colis a été remis au transporteur.",
    state: "pending",
  },
  {
    label: "En livraison",
    description: "Le colis est en cours d'acheminement vers votre adresse de livraison.",
    state: "pending",
  },
  {
    label: "Livrée",
    description: "Votre colis a été livré. Nous espérons qu'il vous plaira.",
    state: "pending",
  },
];

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C9A961]">
        <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span
          className="absolute h-6 w-6 rounded-full bg-[#C9A961]/30 animate-ping"
          aria-hidden="true"
        />
        <span className="relative h-3 w-3 rounded-full bg-[#C9A961]" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="h-6 w-6 rounded-full border-2 border-border bg-muted" aria-hidden="true" />
  );
}

export function TrackingPage({ onNavigate }: TrackingPageProps) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const navigate =
    onNavigate ??
    ((page: string) =>
      router.push(page === "home" ? "/" : `/?page=${page}`, { scroll: true }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ref = reference.trim().toUpperCase();
    if (!ref) return;
    setSubmittedRef(ref);
  };

  return (
    <div className="bg-background flex-1 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <header className="mb-10 text-center">
          <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-2">
            Aide &amp; Informations
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Suivi de commande
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Entrez votre numéro de commande pour consulter l'état d'avancement
            de votre colis, étape par étape.
          </p>
        </header>

        {/* Formulaire de suivi */}
        <div className="max-w-xl mx-auto">
          <div className="bg-card rounded-2xl border p-6 sm:p-8 shadow-sm">
            <div className="w-fit p-3 bg-[#C9A961]/10 rounded-xl mb-5">
              <PackageSearch className="w-6 h-6 text-[#C9A961]" aria-hidden="true" />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="order-reference"
                  className="text-sm font-medium text-foreground"
                >
                  Numéro de commande
                </Label>
                <Input
                  id="order-reference"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="ex : MC-7F3K2A"
                  autoComplete="off"
                  className="h-12 rounded-full"
                />
                <p className="text-xs text-muted-foreground">
                  Le numéro de commande figure dans votre email de confirmation.
                </p>
              </div>
              <button
                type="submit"
                className="btn-shine w-full inline-flex items-center justify-center gap-2 bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full px-6 h-12 font-semibold transition-colors"
              >
                <PackageSearch className="w-4 h-4" aria-hidden="true" />
                Suivre ma commande
              </button>
            </form>
          </div>
        </div>

        {/* Résultat : timeline de démonstration */}
        {submittedRef && (
          <div className="max-w-xl mx-auto mt-8 animate-fade-up">
            <div className="bg-card rounded-2xl border p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                    Commande
                  </p>
                  <p className="text-lg font-bold text-foreground">{submittedRef}</p>
                </div>
                <span className="rounded-full bg-[#C9A961]/10 text-[#C9A961] text-xs font-semibold px-3.5 py-1.5">
                  En préparation
                </span>
              </div>

              <ol>
                {STEPS.map((step, i) => (
                  <li key={step.label} className="relative flex gap-4 pb-8 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span
                        className={`absolute left-[11px] top-7 bottom-0 w-0.5 ${
                          step.state === "done" ? "bg-[#C9A961]/50" : "bg-border"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <StepIcon state={step.state} />
                    <div className="min-w-0 pt-0.5">
                      <p
                        className={`text-sm font-semibold ${
                          step.state === "pending"
                            ? "text-muted-foreground"
                            : step.state === "current"
                              ? "text-[#C9A961]"
                              : "text-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-8 flex items-start gap-2 text-xs text-muted-foreground/80 leading-relaxed">
                <Info
                  className="w-4 h-4 flex-shrink-0 text-[#C9A961]"
                  aria-hidden="true"
                />
                Le suivi temps réel sera activé avec la connexion du backend —
                référence enregistrée pour recherche.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Besoin d&apos;aide ?{" "}
          <button
            type="button"
            onClick={() => navigate("contact")}
            className="font-medium text-[#C9A961] hover:underline underline-offset-2"
          >
            Contactez-nous
          </button>
        </p>
      </div>
    </div>
  );
}
