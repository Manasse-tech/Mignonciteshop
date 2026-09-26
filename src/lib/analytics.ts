/**
 * Fondation analytique — conventions « grandes entreprises ».
 *
 * Chaque action métier clé (vue produit, ajout panier, début de checkout,
 * achat…) émet un événement structuré. Aujourd'hui : journalisés en console
 * en développement. Lors du backend, brancher `send()` sur un vrai
 * collecteur (endpoint /api/analytics, GA4, Plausible… ) sans toucher aux
 * composants.
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

function send(event: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  const entry = { event, ...payload, ts: new Date().toISOString() };
  if (isDev) {
    console.debug("[analytics]", entry);
  }
  // TODO backend : queue + navigator.sendBeacon("/api/analytics", ...)
}

export function trackPageView(page: string): void {
  send("page_view", { page });
}

export function trackEvent(event: AnalyticsEvent, payload?: AnalyticsPayload): void {
  send(event, payload);
}
