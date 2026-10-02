import { PrismaClient } from '@prisma/client'

// NOTE: pas de cache global en dev afin de recharger le client généré
// après un `prisma db push` (évite les stale clients sans redémarrer le serveur).
export const db = new PrismaClient({
  log: ['query'],
})