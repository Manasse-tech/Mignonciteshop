/**
 * Fondation analytique — conventions « grandes entreprises ».
 *
 * Chaque action métier clé (vue produit, ajout panier, début de checkout,
 * achat…) émet un événement structuré, envoyé au backend via
 * navigator.sendBeacon (fallback fetch keepalive) puis persisté dans la
 * table AnalyticsEvent et consultable dans l'admin (Rapports → Activité).
 *
 * Jamais bloquant : si l'envoi échoue, l'expérience utilisateur est intacte.
 */

export type AnalyticsEvent =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "apply_promo"
  | "search"
  | "wishlist_add"
  | "stock_alert"
  | "review_submitted"
  | "newsletter_signup"
  | "contact_submit";

export interface AnalyticsPayload {
  [key: string]: string | number | boolean | null | undefined;
}

const isDev = process.env.NODE_ENV !== "production";

function dispatch(body: string): void {
  try {
    // sendBeacon survit au changement de page (idéal pour purchase/checkout).
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics", blob)) return;
    }
    if (typeof fetch === "function") {
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // Ignoré volontairement.
  }
}

function send(event: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  const { page, productId, value, ...rest } = payload as {
    page?: string;
    productId?: string;
    value?: number;
  } & AnalyticsPayload;
  const entry = {
    event,
    page: typeof page === "string" ? page : undefined,
    productId: typeof productId === "string" ? productId : undefined,
    value: typeof value === "number" && Number.isFinite(value) ? value : undefined,
    meta: Object.keys(rest).length > 0 ? rest : undefined,
    ts: new Date().toISOString(),
  };
  if (isDev) {
    console.debug("[analytics]", entry);
  }
  dispatch(JSON.stringify(entry));
}

export function trackPageView(page: string): void {
  send("page_view", { page });
}

export function trackEvent(event: AnalyticsEvent, payload?: AnalyticsPayload): void {
  send(event, payload);
}
