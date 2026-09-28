/**
 * Cache mémoire de la liste publique des produits (TTL 30 s).
 *
 * GET /api/products est l'endpoint le plus sollicité de la boutique :
 * sans cache, chaque hit = plusieurs requêtes SQL. Le TTL court garantit
 * une propagation quasi instantanée après toute écriture admin
 * (invalidation explicite via invalidateProductsCache).
 */

import type { Prisma } from "@prisma/client";

type ProductsPayload = Prisma.ProductGetPayload<{ include: { category: true } }>[];

const CACHE_TTL_MS = 30_000;

let cache: { data: ProductsPayload; at: number } | null = null;

export function getProductsCache(): ProductsPayload | null {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  return null;
}

export function setProductsCache(data: ProductsPayload): void {
  cache = { data, at: Date.now() };
}

export function invalidateProductsCache(): void {
  cache = null;
}
