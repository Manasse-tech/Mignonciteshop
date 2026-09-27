/**
 * Mailer transactionnel — abstraction provider.
 *
 * En sandbox (aucune clé SMTP), le provider « log » persiste chaque e-mail
 * dans la table EmailLog : l'admin les consulte dans l'onglet E-mails et le
 * flux métier (confirmation, expédition, réassort, reset) est déjà câblé.
 *
 * Le jour où un vrai provider arrive (SMTP, Resend, Postmark…), il suffit
 * d'implémenter `send()` dans un nouveau provider et de le sélectionner ici
 * — aucun appelant ne change.
 */

import { db } from "@/lib/db";

export type EmailTemplate =
  | "order_confirmation"
  | "order_status"
  | "restock_alert"
  | "welcome"
  | "password_reset"
  | "account_deleted";

export interface SendEmailInput {
  to: string;
  subject: string;
  template: EmailTemplate;
  /** Lignes de texte lisible insérées dans le corps. */
  lines: string[];
  /** Données structurées conservées en JSON (référence, token, produit…). */
  data?: Record<string, string | number | boolean | null>;
}

function renderBody(input: SendEmailInput): string {
  const header = [
    "MignonciteShop — La boutique dorée",
    "──────────────────────────────────",
    "",
  ];
  const footer = [
    "",
    "──────────────────────────────────",
    "Cet e-mail vous a été envoyé par MignonciteShop.",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez-le.",
  ];
  return [...header, ...input.lines, ...footer].join("\n");
}

/**
 * Enregistre un e-mail dans le journal (provider LOG). Ne lève jamais :
 * un e-mail manquant ne doit JAMAIS faire échouer une commande.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    const body = renderBody(input);
    // Provider « log » : status = logged (envoi réel simulé en sandbox).
    // Provider SMTP/Resend futur : tenter l'envoi ici, puis sent | failed.
    await db.emailLog.create({
      data: {
        to: input.to.trim().toLowerCase(),
        subject: input.subject,
        template: input.template,
        body,
        data: JSON.stringify(input.data ?? {}),
        status: "logged",
      },
    });
    console.log(`[mailer:log] → ${input.to} · ${input.subject}`);
  } catch (error) {
    console.error("[mailer] échec enregistrement e-mail:", error);
  }
}

/** Lien de réinitialisation « cliquable » (affiché dans l'admin en démo). */
export function buildResetUrl(token: string): string {
  return `/?page=login&reset=${encodeURIComponent(token)}`;
}
