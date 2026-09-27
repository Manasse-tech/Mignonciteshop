"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Loader2,
  Lock,
  LogOut,
  Package,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { AccountOrder } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "En préparation", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  paid: { label: "Payée", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  shipped: { label: "Expédiée", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  delivered: { label: "Livrée", className: "bg-[#C9A961]/15 text-[#a8873f] dark:text-[#C9A961]" },
  cancelled: { label: "Annulée", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
};

/** Étapes de suivi (barre de progression). */
const STATUS_STEPS = ["pending", "paid", "shipped", "delivered"] as const;

function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
        Commande annulée — le stock a été restitué et le paiement remboursé s'il
        avait été encaissé.
      </p>
    );
  }
  const currentIndex = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progression de la commande">
      {STATUS_STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const label =
          step === "pending" ? "Préparée" : step === "paid" ? "Payée" : step === "shipped" ? "Expédiée" : "Livrée";
        return (
          <li key={step} className="flex-1 min-w-0">
            <div
              className={cn("h-1.5 rounded-full", done ? "bg-[#C9A961]" : "bg-muted")}
              aria-hidden="true"
            />
            <p
              className={cn(
                "mt-1 text-[10px] leading-tight",
                done ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function AccountPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, ready, hydrate, logout } = useAuthStore();
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!ready) void hydrate();
  }, [ready, hydrate]);

  // Chargement des commandes dès qu'une session client est identifiée.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.account
      .orders()
      .then((result) => {
        if (!cancelled) setOrders(result.orders);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Non connecté → invitation à se connecter.
  if (ready && !user) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="w-full max-w-md bg-card rounded-2xl border p-8 text-center">
          <div className="rounded-full bg-[#C9A961]/10 p-4 w-fit mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#C9A961]" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Mon compte
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Connectez-vous pour retrouver l&apos;historique de vos commandes,
            suivre leurs livraisons et gérer vos données personnelles.
          </p>
          <Button
            onClick={() => onNavigate("login")}
            className="w-full rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white py-3 font-semibold"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (!ready || !user) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" aria-hidden="true" />
        Chargement du compte…
      </div>
    );
  }

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await api.account.deleteAccount();
      toast.success(result.message);
      await logout();
      onNavigate("home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="bg-background flex-1 flex flex-col">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* En-tête compte */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-[#C9A961]/10 p-3">
              <User className="w-7 h-7 text-[#C9A961]" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Bonjour {user.name ?? "cher client"}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              onNavigate("home");
            }}
            className="rounded-full gap-2"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Déconnexion
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Historique des commandes */}
          <section className="lg:col-span-2 bg-card rounded-2xl border p-6" aria-label="Historique des commandes">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#C9A961]" aria-hidden="true" />
              Mes commandes
            </h2>

            {orders === null ? (
              <div className="py-12 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
                Chargement…
              </div>
            ) : orders.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Vous n&apos;avez pas encore de commande. Découvrez notre
                  sélection !
                </p>
                <Button
                  onClick={() => onNavigate("shop")}
                  className="rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white"
                >
                  Aller à la boutique
                </Button>
              </div>
            ) : (
              <ul className="space-y-3 max-h-[32rem] overflow-y-auto pr-1 admin-scroll">
                {orders.map((order) => {
                  const badge = STATUS_LABELS[order.status] ?? {
                    label: order.status,
                    className: "bg-muted text-muted-foreground",
                  };
                  return (
                    <li key={order.id} className="rounded-xl border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
                        aria-expanded={expanded === order.id}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="font-mono font-semibold text-foreground text-sm">
                            {order.reference}
                          </span>
                          <Badge className={cn("text-[10px]", badge.className)}>
                            {badge.label}
                          </Badge>
                          <span className="ml-auto font-semibold text-foreground">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}{" "}
                          · {order.items.length} article{order.items.length > 1 ? "s" : ""}
                        </p>
                        <StatusTimeline status={order.status} />
                      </button>

                      {expanded === order.id && (
                        <div className="border-t bg-muted/20 p-4 space-y-3">
                          <ul className="space-y-2">
                            {order.items.map((item) => (
                              <li key={item.id} className="flex items-center gap-3 text-sm">
                                {/* Image de la ligne (snapshot commande) */}
                                <span className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                                  <img
                                    src={item.image}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block font-medium text-foreground truncate">
                                    {item.productName}
                                    {(item.size || item.color) && (
                                      <span className="text-muted-foreground font-normal">
                                        {" "}
                                        ({[item.size, item.color].filter(Boolean).join(", ")})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Quantité : {item.quantity}
                                  </span>
                                </span>
                                <span className="font-medium shrink-0">
                                  {formatPrice(item.unitPrice * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="text-sm space-y-1 border-t pt-3">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Sous-total</span>
                              <span>{formatPrice(order.subtotal)}</span>
                            </div>
                            {order.discount > 0 && (
                              <div className="flex justify-between text-[#a8873f] dark:text-[#C9A961]">
                                <span>Remise {order.promoCode ? `(${order.promoCode})` : ""}</span>
                                <span>-{formatPrice(order.discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                              <span>Livraison</span>
                              <span>
                                {order.shippingCost === 0 ? "Offerte" : formatPrice(order.shippingCost)}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-foreground">
                              <span>Total TTC</span>
                              <span>{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Données personnelles (RGPD) */}
          <section className="bg-card rounded-2xl border p-6 space-y-5 self-start" aria-label="Données personnelles">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C9A961]" aria-hidden="true" />
              Mes données personnelles
            </h2>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Export de mes données
              </h3>
              <p className="text-xs text-muted-foreground">
                Téléchargez au format JSON toutes les données vous concernant
                (commandes, avis, messages, abonnement…) — droit à la
                portabilité RGPD, article 20.
              </p>
              <a
                href={api.account.exportUrl()}
                download
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Exporter mes données
              </a>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-medium text-foreground text-red-600 dark:text-red-400">
                Supprimer mon compte
              </h3>
              <p className="text-xs text-muted-foreground">
                Efface définitivement vos données personnelles. Vos commandes
                sont conservées de façon anonyme (obligation comptable),
                sans aucun rattachement possible — article 17 RGPD.
              </p>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Supprimer mon compte
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation de suppression (irréversible) */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer définitivement votre compte ?</DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong> : vos avis, alertes
              et préférences seront effacés. Vous serez immédiatement
              déconnecté(e). Vos commandes passées seront conservées de manière
              anonyme (exigence comptable), sans aucune donnée personnelle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Suppression…" : "Oui, supprimer mon compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
