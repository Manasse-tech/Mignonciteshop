/**
 * Journal d'audit — trace en base de chaque action admin sensible.
 *
 * Écrit en fire-and-forget best-effort : une erreur d'audit ne doit jamais
 * faire échouer l'action métier elle-même.
 */

import { db } from "@/lib/db";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.restock"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "order.status"
  | "order.refund"
  | "promo.create"
  | "promo.update"
  | "promo.delete"
  | "review.approve"
  | "review.unpublish"
  | "review.delete"
  | "customer.role"
  | "settings.update"
  | "payment.webhook";

export async function logAudit(input: {
  actor: string;
  action: AuditAction;
  target?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actor: input.actor,
        action: input.action,
        target: input.target ?? "",
        details: JSON.stringify(input.details ?? {}),
      },
    });
  } catch (error) {
    console.error("[audit] échec journalisation:", error);
  }
}
