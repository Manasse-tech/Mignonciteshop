/**
 * Couche d'accès API typée — point d'entrée unique vers le backend.
 *
 * Toutes les requêtes frontend passent ici : lors du développement du
 * backend, il suffira de compléter les endpoints sans toucher aux
 * composants. Gestion d'erreurs unifiée via ApiError.
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
  // Avis clients (persistance au backend : model Review)
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
    }): Promise<{ ok: boolean }> {
      return post("/api/reviews", data);
    },
  },

  // -------------------------------------------------------------------------
  // Commandes — ENDPOINT À CRÉER LORS DU BACKEND (model Order déjà en Prisma)
  // -------------------------------------------------------------------------
  orders: {
    create(data: unknown): Promise<{ ok: boolean; reference?: string }> {
      // TODO backend : POST /api/orders (création commande + décrément stock)
      return post("/api/orders", data);
    },
  },

  // -------------------------------------------------------------------------
  // Alertes de réassort — ENDPOINT À CRÉER LORS DU BACKEND (model StockAlert)
  // -------------------------------------------------------------------------
  stockAlerts: {
    subscribe(productId: string, email: string): Promise<{ ok: boolean }> {
      // TODO backend : POST /api/stock-alerts
      return post("/api/stock-alerts", { productId, email });
    },
  },

  // -------------------------------------------------------------------------
  // Validation code promo — ENDPOINT À CRÉER LORS DU BACKEND (model PromoCode)
  // -------------------------------------------------------------------------
  promos: {
    validate(code: string, subtotal: number): Promise<{ ok: boolean; error?: string }> {
      // TODO backend : POST /api/promos/validate
      return post("/api/promos/validate", { code, subtotal });
    },
  },
};
