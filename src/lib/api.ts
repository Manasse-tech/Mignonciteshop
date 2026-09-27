/**
 * Couche d'accès API typée — point d'entrée unique vers le backend.
 *
 * Toutes les requêtes frontend passent ici. Gestion d'erreurs unifiée
 * via ApiError (le serveur renvoie { error: "message" } avec un statut).
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Impossible de contacter le serveur. Vérifiez votre connexion.", 0);
  }

  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Erreur ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return payload as T;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Types admin (contrats des routes /api/admin/*)
// ---------------------------------------------------------------------------

export interface AdminOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  image: string;
  unitPrice: number;
  quantity: number;
  size: string | null;
  color: string | null;
}

export interface AdminOrder {
  id: string;
  reference: string;
  status: string; // pending | paid | shipped | delivered | cancelled
  email: string;
  customerName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  shippingMethod: string;
  shippingCost: number;
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  paymentMethod: string;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  items: AdminOrderItem[];
}

export interface AdminStats {
  revenue: number;
  ordersCount: number;
  avgOrder: number;
  inventoryValue: number;
  lowStockThreshold: number;
  productsCount: number;
  activeProductsCount: number;
  lowStock: number;
  pendingReviews: number;
  pendingMessages: number;
  subscribersCount: number;
  recentOrders: AdminOrder[];
  topProducts: {
    id: string;
    name: string;
    image: string;
    soldCount: number;
    price: number;
    stock: number;
  }[];
  daily: { date: string; revenue: number; orders: number }[];
}

export interface AdminReview {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string | null;
  comment: string;
  isApproved: boolean;
  helpful: number;
  createdAt: string;
  product: { name: string; image: string };
}

export interface AdminPromo {
  id: string;
  code: string;
  label: string;
  type: string; // percent | freeship | amount
  value: number;
  minSubtotal: number;
  isActive: boolean;
  expiresAt: string | null;
  usageCount: number;
  maxUses: number | null;
  createdAt: string;
}

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: string;
}

export interface AdminSubscriber {
  id: string;
  email: string;
  createdAt: string;
}

export interface AdminStockAlert {
  id: string;
  email: string;
  productId: string;
  notified: boolean;
  createdAt: string;
  product: { name: string; image: string; stock: number };
}

export interface AdminCustomer {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface AdminReport {
  days: number;
  revenue: number;
  ordersCount: number;
  avgOrder: number;
  newCustomers: number;
  statusBreakdown: Record<string, number>;
  shippingBreakdown: Record<string, number>;
  paymentBreakdown: Record<string, number>;
  salesByCategory: { name: string; revenue: number }[];
  topProducts: {
    id: string;
    name: string;
    image: string;
    stock: number;
    quantity: number;
    revenue: number;
  }[];
  promoUsage: Record<string, number>;
  inventoryValue: number;
  outOfStock: number;
  lowStockProducts: {
    id: string;
    name: string;
    image: string;
    stock: number;
    isActive: boolean;
  }[];
  pendingReviews: number;
  avgRating: number;
  analytics: {
    pageViews: number;
    events: { event: string; count: number }[];
  };
}

export interface AdminEmailLog {
  id: string;
  to: string;
  subject: string;
  template: string;
  body: string;
  data: string;
  status: string;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

export interface AccountOrder {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  shippingMethod: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  promoCode: string | null;
  createdAt: string;
  city: string;
  items: {
    id: string;
    productName: string;
    image: string;
    unitPrice: number;
    quantity: number;
    size: string | null;
    color: string | null;
  }[];
}

export interface TrackedOrder {
  reference: string;
  status: string;
  paymentStatus: string;
  shippingMethod: string;
  city: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  promoCode: string | null;
  items: {
    productName: string;
    image: string;
    quantity: number;
    unitPrice: number;
    size: string | null;
    color: string | null;
  }[];
}

export interface StoreSettingsPublic {
  shipping: { standard: number; express: number; pickup: number };
  freeShippingThreshold: number;
}

export interface AdminSettings {
  shippingStandard: number;
  shippingExpress: number;
  shippingPickup: number;
  freeShippingThreshold: number;
  lowStockThreshold: number;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

import type { Category, Product, Review } from "@/lib/types";

export const api = {
  products: {
    list(): Promise<Product[]> {
      return request<Product[]>("/api/products");
    },
  },
  categories: {
    list(): Promise<Category[]> {
      return request<Category[]>("/api/categories");
    },
  },

  // -------------------------------------------------------------------------
  // Marketing
  // -------------------------------------------------------------------------
  newsletter: {
    subscribe(email: string): Promise<{ ok: boolean; message: string }> {
      return post("/api/newsletter", { email });
    },
  },
  contact: {
    send(data: {
      name: string;
      email: string;
      subject?: string;
      message: string;
    }): Promise<{ ok: boolean; message: string }> {
      return post("/api/contact", data);
    },
  },

  // -------------------------------------------------------------------------
  // Avis clients (modération : GET = approuvés, POST = en attente)
  // -------------------------------------------------------------------------
  reviews: {
    list(productId: string): Promise<Review[]> {
      return request<Review[]>(`/api/reviews?productId=${encodeURIComponent(productId)}`);
    },
    create(data: {
      productId: string;
      rating: number;
      comment: string;
      author: string;
    }): Promise<{ ok: boolean; pending?: boolean }> {
      return post("/api/reviews", data);
    },
  },

  // -------------------------------------------------------------------------
  // Commandes — POST /api/orders (transaction serveur : prix, stock, promo)
  // -------------------------------------------------------------------------
  orders: {
    create(data: {
      email: string;
      customerName: string;
      phone?: string | null;
      items: {
        productId: string;
        quantity: number;
        size?: string | null;
        color?: string | null;
      }[];
      shippingMethod: "standard" | "express" | "pickup";
      promoCode?: string | null;
      paymentMethod?: "card" | "paypal" | "transfer";
      // Données carte (passerelle démo côté serveur — jamais stockées en clair).
      card?: { number: string; holder: string } | null;
      notes?: string | null;
      address: {
        line1: string;
        line2?: string | null;
        postalCode: string;
        city: string;
        country: string;
      };
    }): Promise<{
      ok: boolean;
      reference: string;
      subtotal: number;
      discount: number;
      shippingCost: number;
      total: number;
    }> {
      return post("/api/orders", data);
    },
  },

  // -------------------------------------------------------------------------
  // Alertes de réassort — POST /api/stock-alerts
  // -------------------------------------------------------------------------
  stockAlerts: {
    subscribe(productId: string, email: string): Promise<{ ok: boolean }> {
      return post("/api/stock-alerts", { productId, email });
    },
  },

  // -------------------------------------------------------------------------
  // Validation code promo — POST /api/promos/validate (source de vérité serveur)
  // -------------------------------------------------------------------------
  promos: {
    validate(
      code: string,
      subtotal: number
    ): Promise<{
      ok: boolean;
      error?: string;
      promo?: {
        code: string;
        label: string;
        type: "percent" | "freeship" | "amount";
        value: number;
        minSubtotal: number;
      };
      discount?: number;
      freeShipping?: boolean;
    }> {
      return post("/api/promos/validate", { code, subtotal });
    },
  },

  // -------------------------------------------------------------------------
  // Réglages publics (frais de livraison affichés panier / checkout) —
  // estimation uniquement : le débit réel est recalculé dans POST /api/orders
  // -------------------------------------------------------------------------
  settings: {
    get(): Promise<StoreSettingsPublic> {
      return request<StoreSettingsPublic>("/api/settings");
    },
  },

  // -------------------------------------------------------------------------
  // Auth — register/login/logout + réinitialisation de mot de passe
  // -------------------------------------------------------------------------
  auth: {
    forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
      return post("/api/auth/forgot-password", { email });
    },
    resetPassword(token: string, password: string): Promise<{ ok: boolean; message: string }> {
      return post("/api/auth/reset-password", { token, password });
    },
  },

  // -------------------------------------------------------------------------
  // Compte client (session requise) — historique + RGPD
  // -------------------------------------------------------------------------
  account: {
    orders(): Promise<{ orders: AccountOrder[] }> {
      return request<{ orders: AccountOrder[] }>("/api/account/orders");
    },
    exportUrl(): string {
      return "/api/account/export";
    },
    deleteAccount(): Promise<{ ok: boolean; message: string }> {
      return post("/api/account/delete", {});
    },
  },

  // -------------------------------------------------------------------------
  // Suivi de commande public (référence + e-mail, sans session)
  // -------------------------------------------------------------------------
  track(reference: string, email: string): Promise<{ ok: boolean; order: TrackedOrder }> {
    return request<{ ok: boolean; order: TrackedOrder }>(
      `/api/orders/track?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`
    );
  },

  // -------------------------------------------------------------------------
  // Espace administrateur — routes protégées (session cookie + rôle admin)
  // -------------------------------------------------------------------------
  admin: {
    stats(): Promise<AdminStats> {
      return request<AdminStats>("/api/admin/stats");
    },
    orders(page = 1, limit = 50): Promise<{ orders: AdminOrder[]; total: number; page: number; limit: number }> {
      return request(`/api/admin/orders?page=${page}&limit=${limit}`);
    },
    updateOrderStatus(id: string, status: string): Promise<{ ok: boolean }> {
      return patch("/api/admin/orders", { id, status });
    },
    products(page = 1, limit = 100): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
      return request(`/api/admin/products?page=${page}&limit=${limit}`);
    },
    createProduct(data: {
      name: string;
      categoryId: string;
      price: number;
      oldPrice?: number | null;
      stock: number;
      description?: string;
      details?: string;
      image: string;
      gallery?: string[];
      sizes?: string[];
      colors?: string[];
      isFeatured?: boolean;
      isNew?: boolean;
      isActive?: boolean;
    }): Promise<{ ok: boolean }> {
      return post("/api/admin/products", data);
    },
    updateProduct(
      id: string,
      data: Partial<{
        name: string;
        price: number;
        oldPrice: number | null;
        stock: number;
        description: string;
        details: string;
        image: string;
        categoryId: string;
        gallery: string[];
        sizes: string[];
        colors: string[];
        isFeatured: boolean;
        isNew: boolean;
        isActive: boolean;
      }>
    ): Promise<{ ok: boolean; restockNotified?: number }> {
      return patch("/api/admin/products", { id, ...data });
    },
    deleteProduct(id: string): Promise<{ ok: boolean }> {
      return del("/api/admin/products", { id });
    },
    reviews(status?: "pending" | "approved" | "all"): Promise<AdminReview[]> {
      const query = status && status !== "all" ? `?status=${status}` : "";
      return request<AdminReview[]>(`/api/admin/reviews${query}`);
    },
    setReviewApproval(id: string, isApproved: boolean): Promise<{ ok: boolean }> {
      return patch("/api/admin/reviews", { id, isApproved });
    },
    deleteReview(id: string): Promise<{ ok: boolean }> {
      return del("/api/admin/reviews", { id });
    },
    promos(): Promise<AdminPromo[]> {
      return request<AdminPromo[]>("/api/admin/promos");
    },
    createPromo(data: {
      code: string;
      label: string;
      type: "percent" | "freeship" | "amount";
      value: number;
      minSubtotal: number;
      maxUses?: number | null;
      expiresAt?: string | null;
    }): Promise<{ ok: boolean }> {
      return post("/api/admin/promos", data);
    },
    updatePromo(
      id: string,
      data: Partial<{
        label: string;
        type: "percent" | "freeship" | "amount";
        value: number;
        minSubtotal: number;
        maxUses: number | null;
        expiresAt: string | null;
        isActive: boolean;
      }>
    ): Promise<{ ok: boolean }> {
      return patch("/api/admin/promos", { id, ...data });
    },
    deletePromo(id: string): Promise<{ ok: boolean }> {
      return del("/api/admin/promos", { id });
    },
    messages(): Promise<{
      messages: AdminContactMessage[];
      subscribers: AdminSubscriber[];
      stockAlerts: AdminStockAlert[];
    }> {
      return request("/api/admin/messages");
    },
    customers(q?: string): Promise<AdminCustomer[]> {
      const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      return request<AdminCustomer[]>(`/api/admin/customers${query}`);
    },
    setCustomerRole(id: string, role: "customer" | "admin"): Promise<{ ok: boolean }> {
      return patch("/api/admin/customers", { id, role });
    },
    reports(days: 7 | 30 | 90 = 30): Promise<AdminReport> {
      return request<AdminReport>(`/api/admin/reports?days=${days}`);
    },
    settings(): Promise<AdminSettings> {
      return request<AdminSettings>("/api/admin/settings");
    },
    updateSettings(
      data: Partial<AdminSettings>
    ): Promise<{ ok: boolean; settings: AdminSettings }> {
      return patch("/api/admin/settings", data);
    },
    exportUrl(type: "orders" | "products" | "customers"): string {
      return `/api/admin/export?type=${type}`;
    },
    emails(page = 1, limit = 25, q?: string, template?: string): Promise<{ emails: AdminEmailLog[]; total: number; page: number; limit: number }> {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q && q.trim()) params.set("q", q.trim());
      if (template && template !== "all") params.set("template", template);
      return request(`/api/admin/emails?${params.toString()}`);
    },
    audit(page = 1, limit = 30, action?: string): Promise<{ entries: AdminAuditEntry[]; total: number; page: number; limit: number }> {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (action && action !== "all") params.set("action", action);
      return request(`/api/admin/audit?${params.toString()}`);
    },
  },
};
