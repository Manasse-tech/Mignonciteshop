"use client";

/**
 * Espace administrateur — /?page=admin
 *
 * Accès réservé au rôle "admin" (session cookie httpOnly côté serveur).
 * Onglets : Tableau de bord · Commandes · Produits · Avis · Codes promo · Messages.
 * Toutes les données passent par /api/admin/* (protégées par requireAdmin).
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  Euro,
  ImageOff,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Star,
  Trash2,
  Users,
  X,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type {
  AdminOrder,
  AdminPromo,
  AdminReview,
  AdminStats,
  AdminContactMessage,
  AdminSubscriber,
  AdminStockAlert,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatPrice } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AdminPageProps {
  onNavigate: (page: string) => void;
}

const REFRESH_ICON = "w-4 h-4";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/* ------------------------------------------------------------------------- */
/* Garde d'accès                                                             */
/* ------------------------------------------------------------------------- */

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user, ready, hydrate } = useAuthStore();

  useEffect(() => {
    if (!ready) void hydrate();
  }, [ready, hydrate]);

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" aria-hidden="true" />
        Vérification de la session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="w-full max-w-md bg-card rounded-2xl border p-8 text-center">
          <div className="rounded-full bg-[#C9A961]/10 p-4 w-fit mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#C9A961]" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Espace administrateur
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Cette zone est réservée à l&apos;équipe de la boutique.
            Connectez-vous avec un compte administrateur pour continuer.
          </p>
          <Button
            onClick={() => onNavigate("login")}
            className="bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full"
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="w-full max-w-md bg-card rounded-2xl border p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-4 w-fit mx-auto mb-4">
            <Shield className="w-8 h-8 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Accès refusé
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Votre compte ({user.email}) n&apos;a pas les droits
            d&apos;administration nécessaires.
          </p>
          <Button
            variant="outline"
            onClick={() => onNavigate("home")}
            className="rounded-full"
          >
            Retour à la boutique
          </Button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

/* ------------------------------------------------------------------------- */
/* Dashboard principal                                                       */
/* ------------------------------------------------------------------------- */

const TABS = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "orders", label: "Commandes" },
  { key: "products", label: "Produits" },
  { key: "reviews", label: "Avis" },
  { key: "promos", label: "Codes promo" },
  { key: "messages", label: "Messages" },
] as const;

type AdminTab = (typeof TABS)[number]["key"];

function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="bg-background flex-1 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#C9A961] mb-1">
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              Administration
            </p>
            <h1 className="text-3xl font-bold text-foreground">
              Gestion de la boutique
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="rounded-full gap-2"
          >
            <RefreshCw className={REFRESH_ICON} aria-hidden="true" />
            Actualiser
          </Button>
        </header>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as AdminTab)}
          className="mb-6"
        >
          <TabsList className="flex flex-wrap h-auto gap-1">
            {TABS.map((item) => (
              <TabsTrigger key={item.key} value={item.key}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {tab === "dashboard" && <StatsPanel refreshKey={refreshKey} />}
        {tab === "orders" && <OrdersPanel refreshKey={refreshKey} />}
        {tab === "products" && <ProductsPanel refreshKey={refreshKey} />}
        {tab === "reviews" && <ReviewsPanel refreshKey={refreshKey} />}
        {tab === "promos" && <PromosPanel refreshKey={refreshKey} />}
        {tab === "messages" && <MessagesPanel refreshKey={refreshKey} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Onglet — Tableau de bord                                                  */
/* ------------------------------------------------------------------------- */

function StatsPanel({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.admin
      .stats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossible de charger les statistiques.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) return <PanelLoader label="Chargement du tableau de bord…" />;
  if (!stats) return <PanelError label="Statistiques indisponibles." />;

  const maxRevenue = Math.max(1, ...stats.daily.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Euro className="w-5 h-5" aria-hidden="true" />}
          label="Chiffre d'affaires"
          value={formatPrice(stats.revenue)}
        />
        <KpiCard
          icon={<Package className="w-5 h-5" aria-hidden="true" />}
          label="Commandes"
          value={String(stats.ordersCount)}
        />
        <KpiCard
          icon={<BarChart3 className="w-5 h-5" aria-hidden="true" />}
          label="Produits actifs"
          value={`${stats.activeProductsCount}/${stats.productsCount}`}
        />
        <KpiCard
          icon={<MessageSquare className="w-5 h-5" aria-hidden="true" />}
          label="À traiter"
          value={`${stats.pendingReviews} avis · ${stats.pendingMessages} msg`}
          alert={stats.pendingReviews + stats.pendingMessages > 0}
        />
      </div>

      {/* Ventes 14 jours */}
      <section className="bg-card rounded-2xl border p-6">
        <h2 className="font-semibold text-foreground mb-4">
          Ventes des 14 derniers jours
        </h2>
        <div className="flex items-end gap-1.5 h-32" role="img" aria-label="Graphique des ventes quotidiennes">
          {stats.daily.map((day) => (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
              title={`${day.date} — ${formatPrice(day.revenue)} (${day.orders} cmd)`}
            >
              <div
                className="w-full rounded-t bg-[#C9A961]/80 hover:bg-[#C9A961] transition-colors"
                style={{ height: `${Math.max(3, (day.revenue / maxRevenue) * 100)}%` }}
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {shortDate(day.date)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières commandes */}
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="font-semibold text-foreground mb-4">
            Dernières commandes
          </h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune commande pour le moment.
            </p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-1 admin-scroll">
              {stats.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 text-sm border-b border-border/60 pb-3 last:pb-0 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-foreground truncate">
                      {order.reference}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.customerName} · {order.items.length} article
                      {order.items.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-foreground">
                      {formatPrice(order.total)}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top produits */}
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="font-semibold text-foreground mb-4">
            Meilleures ventes
          </h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune vente enregistrée.
            </p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-1 admin-scroll">
              {stats.topProducts.map((product, index) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 text-sm border-b border-border/60 pb-3 last:pb-0 last:border-0"
                >
                  <span className="w-6 h-6 rounded-full bg-[#C9A961]/15 text-[#C9A961] font-bold flex items-center justify-center text-xs shrink-0">
                    {index + 1}
                  </span>
                  <ProductThumb image={product.image} name={product.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.soldCount} vendu{product.soldCount > 1 ? "s" : ""} · stock {product.stock}
                    </p>
                  </div>
                  <span className="font-semibold shrink-0">
                    {formatPrice(product.price)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Alertes stock bas */}
      {stats.lowStock > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          {stats.lowStock} produit{stats.lowStock > 1 ? "s" : ""} en stock
          faible (≤ 5) — pensez au réassort.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Onglet — Commandes                                                        */
/* ------------------------------------------------------------------------- */

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  paid: "Payée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    paid: "bg-[#C9A961]/15 text-[#a8873f] dark:text-[#C9A961]",
    shipped: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-red-500/15 text-red-700 dark:text-red-400",
  };
  return (
    <Badge className={cn("text-[10px] font-semibold", styles[status] ?? "")}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function OrdersPanel({ refreshKey }: { refreshKey: number }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await api.admin.orders());
    } catch {
      toast.error("Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleStatus = async (order: AdminOrder, status: string) => {
    setUpdating(order.id);
    try {
      await api.admin.updateOrderStatus(order.id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status } : o))
      );
      toast.success(
        status === "cancelled"
          ? `Commande ${order.reference} annulée — stock restitué.`
          : `Commande ${order.reference} → ${STATUS_LABELS[status]}.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible."
      );
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <PanelLoader label="Chargement des commandes…" />;
  if (orders.length === 0)
    return <PanelError label="Aucune commande enregistrée pour le moment." />;

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <article key={order.id} className="bg-card rounded-2xl border overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              className="text-left min-w-0 flex-1"
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              aria-expanded={expanded === order.id}
            >
              <p className="font-mono font-bold text-foreground">
                {order.reference}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {order.customerName} · {order.email} ·{" "}
                {formatDate(order.createdAt)}
              </p>
            </button>
            <div className="text-right">
              <p className="font-bold text-foreground">
                {formatPrice(order.total)}
              </p>
              <OrderStatusBadge status={order.status} />
            </div>
            <Select
              value={order.status}
              onValueChange={(value) => handleStatus(order, value)}
              disabled={updating === order.id}
            >
              <SelectTrigger
                className="w-[150px] h-9 rounded-xl"
                aria-label={`Statut de la commande ${order.reference}`}
              >
                {updating === order.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {expanded === order.id && (
            <div className="border-t border-border bg-muted/30 p-4 sm:p-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Articles</h3>
                <ul className="space-y-2">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5">
                      <ProductThumb image={item.image} name={item.productName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatPrice(item.unitPrice)}
                          {item.size ? ` · taille ${item.size}` : ""}
                          {item.color ? ` · ${item.color}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <h3 className="font-semibold text-foreground mb-2">
                  Livraison &amp; paiement
                </h3>
                <p>
                  {order.addressLine1}
                  {order.addressLine2 ? `, ${order.addressLine2}` : ""}
                </p>
                <p>
                  {order.postalCode} {order.city}, {order.country}
                </p>
                <p>
                  Livraison : <span className="text-foreground">{order.shippingMethod}</span>{" "}
                  ({formatPrice(order.shippingCost)})
                </p>
                <p>
                  Paiement : <span className="text-foreground">{order.paymentMethod}</span>{" "}
                  — {order.paymentStatus === "paid" ? "payé" : "non payé"}
                </p>
                {order.promoCode && (
                  <p>
                    Code promo : <span className="font-mono text-[#C9A961]">{order.promoCode}</span>{" "}
                    (−{formatPrice(order.discount)})
                  </p>
                )}
                <p className="pt-1 border-t border-border/60 mt-2">
                  Sous-total {formatPrice(order.subtotal)} + livraison{" "}
                  {formatPrice(order.shippingCost)} − remise{" "}
                  {formatPrice(order.discount)} ={" "}
                  <span className="font-bold text-foreground">
                    {formatPrice(order.total)}
                  </span>
                </p>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Onglet — Produits                                                         */
/* ------------------------------------------------------------------------- */

interface ProductFormState {
  id?: string;
  name: string;
  categoryId: string;
  price: string;
  oldPrice: string;
  stock: string;
  description: string;
  details: string;
  image: string;
  sizes: string;
  colors: string;
  isFeatured: boolean;
  isNew: boolean;
  isActive: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  categoryId: "",
  price: "",
  oldPrice: "",
  stock: "0",
  description: "",
  details: "",
  image: "",
  sizes: "",
  colors: "",
  isFeatured: false,
  isNew: true,
  isActive: true,
};

function ProductsPanel({ refreshKey }: { refreshKey: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    try {
      const [productRows, categoryRows] = await Promise.all([
        api.admin.products(),
        api.categories.list(),
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch {
      toast.error("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      stock: String(product.stock),
      description: product.description,
      details: product.details,
      image: product.image,
      sizes: parseList(product.sizes).join(", "),
      colors: parseList(product.colors).join(", "),
      isFeatured: product.isFeatured,
      isNew: product.isNew,
      isActive: product.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const price = Number(form.price.replace(",", "."));
    if (!form.name.trim() || !form.categoryId || Number.isNaN(price) || price <= 0) {
      toast.error("Nom, catégorie et prix valides sont requis.");
      return;
    }
    const oldPrice = form.oldPrice.trim()
      ? Number(form.oldPrice.replace(",", "."))
      : null;
    if (oldPrice !== null && Number.isNaN(oldPrice)) {
      toast.error("Ancien prix invalide.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      price,
      oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      description: form.description.trim(),
      details: form.details.trim(),
      image: form.image.trim() || "/images/products/placeholder.svg",
      gallery: [],
      sizes: splitList(form.sizes),
      colors: splitList(form.colors),
      isFeatured: form.isFeatured,
      isNew: form.isNew,
      isActive: form.isActive,
    };

    try {
      if (form.id) {
        await api.admin.updateProduct(form.id, payload);
        toast.success(`« ${payload.name} » mis à jour.`);
      } else {
        await api.admin.createProduct(payload);
        toast.success(`« ${payload.name} » créé.`);
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enregistrement impossible."
      );
    } finally {
      setSaving(false);
    }
  };

  const quickPatch = async (
    product: Product,
    data: Partial<Product>
  ) => {
    try {
      await api.admin.updateProduct(product.id, data);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...data } : p))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible."
      );
    }
  };

  const adjustStock = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    await quickPatch(product, { stock: nextStock });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.admin.deleteProduct(deleteTarget.id);
      toast.success(`« ${deleteTarget.name} » supprimé.`);
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible."
      );
    }
  };

  if (loading) return <PanelLoader label="Chargement du catalogue…" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={openCreate}
          className="bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full gap-2"
        >
          <Plus className={REFRESH_ICON} aria-hidden="true" />
          Nouveau produit
        </Button>
      </div>

      {products.map((product) => (
        <article
          key={product.id}
          className="bg-card rounded-2xl border p-4 flex flex-wrap items-center gap-3 sm:gap-4"
        >
          <ProductThumb image={product.image} name={product.name} large />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">
              {product.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {product.category?.name ?? "—"} · {formatPrice(product.price)} ·{" "}
              {product.soldCount} vendus
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {!product.isActive && (
                <Badge className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-400">
                  Masqué
                </Badge>
              )}
              {product.isFeatured && (
                <Badge className="text-[10px] bg-[#C9A961]/15 text-[#a8873f] dark:text-[#C9A961]">
                  Vedette
                </Badge>
              )}
              {product.isNew && (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  Nouveau
                </Badge>
              )}
              {product.stock <= 5 && (
                <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  Stock faible
                </Badge>
              )}
            </div>
          </div>

          {/* Stock rapide */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              aria-label={`Retirer 1 au stock de ${product.name}`}
              onClick={() => adjustStock(product, -1)}
            >
              −
            </Button>
            <span
              className={cn(
                "w-10 text-center font-semibold text-sm",
                product.stock <= 5 ? "text-amber-600" : "text-foreground"
              )}
              aria-label={`Stock actuel : ${product.stock}`}
            >
              {product.stock}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              aria-label={`Ajouter 1 au stock de ${product.name}`}
              onClick={() => adjustStock(product, 1)}
            >
              +
            </Button>
          </div>

          {/* Interrupteurs */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Switch
                checked={product.isActive}
                onCheckedChange={(checked) =>
                  quickPatch(product, { isActive: checked })
                }
                aria-label={`Produit actif : ${product.name}`}
              />
              Actif
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Switch
                checked={product.isFeatured}
                onCheckedChange={(checked) =>
                  quickPatch(product, { isFeatured: checked })
                }
                aria-label={`Produit vedette : ${product.name}`}
              />
              Vedette
            </label>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label={`Modifier ${product.name}`}
              onClick={() => openEdit(product)}
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full text-destructive hover:text-destructive"
              aria-label={`Supprimer ${product.name}`}
              onClick={() => setDeleteTarget(product)}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </article>
      ))}

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto admin-scroll">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
            <DialogDescription>
              Les modifications sont visibles immédiatement en boutique.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom du produit *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex : Tapis de Yoga Pro"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Catégorie *">
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setForm({ ...form, categoryId: value })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Prix (€) *">
                <Input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  inputMode="decimal"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Ancien prix (€)">
                <Input
                  value={form.oldPrice}
                  onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                  inputMode="decimal"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Stock *">
                <Input
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  inputMode="numeric"
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>

            <Field label="URL de l'image principale *">
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="/images/products/mon-produit.jpg"
                className="h-10 rounded-xl"
              />
            </Field>

            <Field label="Description courte">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="rounded-xl"
              />
            </Field>

            <Field label="Détails (une ligne par point)">
              <Textarea
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                rows={3}
                className="rounded-xl"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Tailles (séparées par des virgules)">
                <Input
                  value={form.sizes}
                  onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                  placeholder="S, M, L, XL"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Couleurs (séparées par des virgules)">
                <Input
                  value={form.colors}
                  onChange={(e) => setForm({ ...form, colors: e.target.value })}
                  placeholder="Noir, Or"
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
                Visible en boutique
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(checked) => setForm({ ...form, isFeatured: checked })}
                />
                Produit vedette
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={form.isNew}
                  onCheckedChange={(checked) => setForm({ ...form, isNew: checked })}
                />
                Badge nouveau
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {form.id ? "Enregistrer" : "Créer le produit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce produit ?</DialogTitle>
            <DialogDescription>
              « {deleteTarget?.name} » sera définitivement supprimé, avec ses
              avis et alertes de réassort. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="rounded-full gap-2"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Onglet — Avis (modération)                                                */
/* ------------------------------------------------------------------------- */

function ReviewsPanel({ refreshKey }: { refreshKey: number }) {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (status: "pending" | "approved" | "all") => {
      try {
        setReviews(await api.admin.reviews(status));
      } catch {
        toast.error("Impossible de charger les avis.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(filter);
  }, [load, filter, refreshKey]);

  const handleModerate = async (review: AdminReview, isApproved: boolean) => {
    try {
      await api.admin.setReviewApproval(review.id, isApproved);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      toast.success(
        isApproved
          ? "Avis approuvé — il est désormais visible en boutique."
          : "Avis dépublié."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Modération impossible."
      );
    }
  };

  const handleDelete = async (review: AdminReview) => {
    try {
      await api.admin.deleteReview(review.id);
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
      toast.success("Avis supprimé.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible."
      );
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
        <TabsList>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Approuvés</TabsTrigger>
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <PanelLoader label="Chargement des avis…" />
      ) : reviews.length === 0 ? (
        <PanelError label="Aucun avis dans cette catégorie." />
      ) : (
        <div className="grid gap-3">
          {reviews.map((review) => (
            <article key={review.id} className="bg-card rounded-2xl border p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <ProductThumb image={review.product.image} name={review.product.name} />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {review.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {review.author} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1" aria-label={`Note : ${review.rating} sur 5`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={cn(
                        "w-4 h-4",
                        index < review.rating
                          ? "fill-[#C9A961] text-[#C9A961]"
                          : "text-muted-foreground/40"
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
              {review.title && (
                <p className="font-medium text-foreground text-sm mb-1">
                  {review.title}
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
                {review.comment}
              </p>
              <div className="flex flex-wrap gap-2">
                {review.isApproved ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleModerate(review, false)}
                    className="rounded-full gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    Dépublier
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleModerate(review, true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Approuver
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(review)}
                  className="rounded-full gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Supprimer
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Onglet — Codes promo                                                      */
/* ------------------------------------------------------------------------- */

const PROMO_TYPE_LABELS: Record<string, string> = {
  percent: "Remise %",
  amount: "Montant €",
  freeship: "Livraison offerte",
};

interface PromoFormState {
  code: string;
  label: string;
  type: "percent" | "freeship" | "amount";
  value: string;
  minSubtotal: string;
  maxUses: string;
}

const EMPTY_PROMO: PromoFormState = {
  code: "",
  label: "",
  type: "percent",
  value: "10",
  minSubtotal: "0",
  maxUses: "",
};

function PromosPanel({ refreshKey }: { refreshKey: number }) {
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PromoFormState>(EMPTY_PROMO);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.admin
      .promos()
      .then(setPromos)
      .catch(() => toast.error("Impossible de charger les codes promo."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleCreate = async () => {
    const value = Number(form.value.replace(",", "."));
    if (!form.code.trim() || !form.label.trim() || Number.isNaN(value)) {
      toast.error("Code, libellé et valeur valides sont requis.");
      return;
    }
    setSaving(true);
    try {
      await api.admin.createPromo({
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        type: form.type,
        value: form.type === "freeship" ? 0 : value,
        minSubtotal: Math.max(0, Number(form.minSubtotal.replace(",", ".")) || 0),
        maxUses: form.maxUses.trim() ? Math.round(Number(form.maxUses)) : null,
        expiresAt: null,
      });
      toast.success(`Code ${form.code.toUpperCase()} créé et actif.`);
      setDialogOpen(false);
      setForm(EMPTY_PROMO);
      load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (promo: AdminPromo) => {
    try {
      await api.admin.updatePromo(promo.id, { isActive: !promo.isActive });
      setPromos((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, isActive: !p.isActive } : p))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible."
      );
    }
  };

  const remove = async (promo: AdminPromo) => {
    try {
      await api.admin.deletePromo(promo.id);
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
      toast.success(`Code ${promo.code} supprimé.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible."
      );
    }
  };

  if (loading) return <PanelLoader label="Chargement des codes promo…" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full gap-2"
        >
          <Plus className={REFRESH_ICON} aria-hidden="true" />
          Nouveau code
        </Button>
      </div>

      {promos.length === 0 ? (
        <PanelError label="Aucun code promo. Créez-en un !" />
      ) : (
        promos.map((promo) => (
          <article
            key={promo.id}
            className="bg-card rounded-2xl border p-4 flex flex-wrap items-center gap-3 sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-mono font-bold text-[#C9A961]">{promo.code}</p>
              <p className="text-sm text-foreground">{promo.label}</p>
              <p className="text-xs text-muted-foreground">
                {PROMO_TYPE_LABELS[promo.type] ?? promo.type}
                {promo.type !== "freeship" && ` · valeur ${promo.value}`}
                {promo.minSubtotal > 0 &&
                  ` · dès ${formatPrice(promo.minSubtotal)}`}
                {` · utilisé ${promo.usageCount} fois`}
                {promo.maxUses !== null && ` / ${promo.maxUses}`}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Switch
                checked={promo.isActive}
                onCheckedChange={() => toggle(promo)}
                aria-label={`Activer le code ${promo.code}`}
              />
              {promo.isActive ? "Actif" : "Inactif"}
            </label>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full text-destructive hover:text-destructive"
              aria-label={`Supprimer le code ${promo.code}`}
              onClick={() => remove(promo)}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </article>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau code promo</DialogTitle>
            <DialogDescription>
              Le code sera immédiatement utilisable en boutique.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Code *">
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="ETE25"
                  className="h-10 rounded-xl font-mono"
                />
              </Field>
              <Field label="Libellé affiché *">
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="-25 % pour l'été"
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Type">
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({ ...form, type: value as PromoFormState["type"] })
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Remise %</SelectItem>
                    <SelectItem value="amount">Montant €</SelectItem>
                    <SelectItem value="freeship">Livraison offerte</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={form.type === "percent" ? "Valeur (%)" : "Valeur (€)"}>
                <Input
                  value={form.type === "freeship" ? "0" : form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  disabled={form.type === "freeship"}
                  inputMode="decimal"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Minimum d'achat (€)">
                <Input
                  value={form.minSubtotal}
                  onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })}
                  inputMode="decimal"
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>
            <Field label="Limite d'utilisations (vide = illimité)">
              <Input
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                inputMode="numeric"
                placeholder="100"
                className="h-10 rounded-xl"
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-full"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Créer le code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Onglet — Messages, newsletter, alertes stock                              */
/* ------------------------------------------------------------------------- */

function MessagesPanel({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<{
    messages: AdminContactMessage[];
    subscribers: AdminSubscriber[];
    stockAlerts: AdminStockAlert[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.admin
      .messages()
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossible de charger la boîte de réception.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) return <PanelLoader label="Chargement de la boîte de réception…" />;
  if (!data) return <PanelError label="Boîte de réception indisponible." />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Messages de contact */}
      <section className="bg-card rounded-2xl border p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#C9A961]" aria-hidden="true" />
          Messages de contact ({data.messages.length})
        </h2>
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun message reçu.</p>
        ) : (
          <ul className="space-y-4 max-h-96 overflow-y-auto pr-1 admin-scroll">
            {data.messages.map((message) => (
              <li key={message.id} className="border-b border-border/60 pb-4 last:pb-0 last:border-0">
                <p className="font-medium text-foreground text-sm">
                  {message.subject || "Sans objet"}
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  {message.name} · {message.email} · {formatDate(message.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {message.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-6">
        {/* Newsletter */}
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C9A961]" aria-hidden="true" />
            Newsletter ({data.subscribers.length})
          </h2>
          {data.subscribers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun abonné.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1 admin-scroll">
              {data.subscribers.map((subscriber) => (
                <li
                  key={subscriber.id}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                >
                  {subscriber.email}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Alertes réassort */}
        <section className="bg-card rounded-2xl border p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#C9A961]" aria-hidden="true" />
            Alertes réassort ({data.stockAlerts.length})
          </h2>
          {data.stockAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune alerte de réassort.
            </p>
          ) : (
            <ul className="space-y-3 max-h-56 overflow-y-auto pr-1 admin-scroll">
              {data.stockAlerts.map((alert) => (
                <li key={alert.id} className="flex items-center gap-3 text-sm">
                  <ProductThumb image={alert.product.image} name={alert.product.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {alert.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.email} · stock actuel {alert.product.stock}
                      {alert.notified ? " · notifié" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Primitives partagées                                                      */
/* ------------------------------------------------------------------------- */

function KpiCard({
  icon,
  label,
  value,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            "rounded-full p-2",
            alert
              ? "bg-amber-500/15 text-amber-600"
              : "bg-[#C9A961]/12 text-[#C9A961]"
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-lg sm:text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ProductThumb({
  image,
  name,
  large = false,
}: {
  image: string;
  name: string;
  large?: boolean;
}) {
  const size = large ? "h-14 w-14" : "h-10 w-10";
  if (!image) {
    return (
      <span
        className={cn(
          size,
          "rounded-lg bg-muted flex items-center justify-center shrink-0"
        )}
        aria-hidden="true"
      >
        <ImageOff className="w-4 h-4 text-muted-foreground" />
      </span>
    );
  }
  return (
    <img
      src={image}
      alt=""
      aria-hidden="true"
      className={cn(size, "rounded-lg object-cover border border-border/60 shrink-0")}
      loading="lazy"
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function PanelLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2.5" aria-hidden="true" />
      {label}
    </div>
  );
}

function PanelError({ label }: { label: string }) {
  return (
    <div className="bg-card rounded-2xl border p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

/* Helpers listes (champs "S, M, L" ↔ string[]) */

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
