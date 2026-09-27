/**
 * Couche paiement — abstraction provider.
 *
 * Architecture prête pour Stripe : le jour où les clés arrivent, il suffit
 * d'implémenter `PaymentProvider` avec le SDK Stripe (PaymentIntent +
 * webhook) et de le sélectionner ici — aucun appelant ne change.
 *
 * En attendant, le provider « demo » simule une autorisation bancaire de
 * façon déterministe :
 *   - 4242 4242 4242 4242  → autorisée (carte de test Stripe standard)
 *   - 4000 0000 0000 0002  → refusée (carte déclinée)
 *   - toute autre carte    → autorisée (sauf numéro évidemment invalide)
 */

export interface ChargeResult {
  ok: boolean;
  /** Identifiant de transaction du provider (ex: ch_demo_xxx). */
  transactionId: string;
  error?: string;
}

export interface ChargeInput {
  amount: number;
  currency: "eur";
  /** Numéro de carte démo (16 chiffres). */
  cardNumber: string;
  cardHolder: string;
  orderReference: string;
}

export type PaymentProviderId = "demo" | "stripe";

/** Le provider actif — bascule automatique si STRIPE_SECRET_KEY existe. */
export function activeProvider(): PaymentProviderId {
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "demo";
}

function randomTransactionId(reference: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `ch_demo_${reference.toLowerCase()}_${rand}`;
}

/**
 * Autorise (simule) un paiement carte. En sandbox le montant a DÉJÀ été
 * recalculé serveur par /api/orders — jamais de montant client ici.
 */
export async function chargeCard(input: ChargeInput): Promise<ChargeResult> {
  if (activeProvider() === "stripe") {
    // TODO: intégration Stripe PaymentIntent (confirm off-session).
    // Non exécutée en sandbox : on retombe sur la démo.
  }

  const digits = input.cardNumber.replace(/\s/g, "");

  // Cartes de test reconnues (mêmes que la documentation Stripe).
  if (digits === "4000000000000002") {
    return {
      ok: false,
      transactionId: randomTransactionId(input.orderReference),
      error: "Paiement refusé par votre banque (carte de test déclinée).",
    };
  }

  // Garde-fou minimal : 16 chiffres attendus (la validation Zod a déjà filtré).
  if (!/^\d{16}$/.test(digits)) {
    return {
      ok: false,
      transactionId: randomTransactionId(input.orderReference),
      error: "Numéro de carte invalide.",
    };
  }

  return { ok: true, transactionId: randomTransactionId(input.orderReference) };
}

/** Rembourse (simule) une transaction — appelé à l'annulation d'une commande payée. */
export async function refundTransaction(transactionId: string, orderReference: string): Promise<boolean> {
  if (activeProvider() === "stripe") {
    // TODO: stripe.refunds.create({ payment_intent }) avec mapping transactionId.
  }
  const ok = transactionId.startsWith("ch_demo_");
  if (ok) console.log(`[payments:demo] remboursement ${transactionId} (${orderReference})`);
  return ok;
}
