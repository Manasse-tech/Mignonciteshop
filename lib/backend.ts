import 'server-only'

import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { getFirebaseAdmin, isFirebaseConfigured, fbId, nowISO } from '@/lib/firebase'

/**
 * ===== Couche de données à double backend (Firebase ⇄ local) =====
 *
 * Toutes les routes /api/* passent par CE fichier : chaque fonction choisit
 * automatiquement son implémentation —
 *  - Firebase (Firestore via firebase-admin) quand FIREBASE_API_KEY +
 *    FIREBASE_SERVICE_ACCOUNT sont définies (backend de production) ;
 *  - Prisma/SQLite sinon (backend local de secours — l'app reste fonctionnelle
 *    tant que l'utilisateur n'a pas collé ses clés Firebase).
 *
 * Contrat : les formes JSON retournées sont IDENTIQUES dans les deux modes
 * (mêmes champs, dates en ISO) → le frontend ne change pas d'un octet.
 *
 * Firestore : les collections restent volontairement petites (boutique) →
 * lecture complète + filtrage/tri en JS, ce qui évite tout index composite à
 * créer manuellement dans la console. Passage à l'échelle : ajouter des
 * requêtes indexées si > 1000 documents par collection.
 */

export const isFirebaseMode = (): boolean => isFirebaseConfigured()

// ---------------------------------------------------------------------------
// Formes de données (identiques au contrat JSON historique)
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string
  email: string
  passwordHash: string
  name: string
  role: 'admin' | 'user' | string
  firebaseUid?: string | null
  emailVerified?: boolean
  createdAt: string
  updatedAt: string
}

export interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  order: number
  productCount?: number
  createdAt: string
  updatedAt: string
}

export interface ProductRow {
  id: string
  name: string
  slug: string
  description: string | null
  details: string | null
  price: number
  oldPrice: number | null
  image: string
  gallery: string
  categoryId: string | null
  category?: CategoryRow | null
  stock: number
  rating: number
  reviewCount: number
  soldCount: number
  isFeatured: boolean
  isNew: boolean
  isActive: boolean
  sizes: string
  colors: string
  createdAt: string
  updatedAt: string
}

export interface OrderItemRow {
  id: string
  orderId: string
  productId: string | null
  name: string
  price: number
  image: string | null
  quantity: number
}

export interface OrderRow {
  id: string
  orderNumber: string
  userId: string | null
  customerName: string
  customerEmail: string
  phone: string | null
  address: string
  city: string
  postalCode: string | null
  country: string
  paymentMethod: string
  shippingMethod: string
  subtotal: number
  shipping: number
  discount: number
  promoCode: string | null
  total: number
  status: string
  pointsUsed: number
  notes: string | null
  items: OrderItemRow[]
  createdAt: string
  updatedAt: string
}

export interface ReviewRow {
  id: string
  productId: string
  product?: { id: string; name: string; image: string | null } | null
  userId: string | null
  author: string
  email?: string | null
  rating: number
  title: string | null
  content: string
  status: string
  helpfulCount: number
  photos: string
  createdAt: string
}

export interface QuestionRow {
  id: string
  productId: string
  product?: { id: string; name: string; image: string | null } | null
  author: string
  question: string
  answer: string | null
  status: string
  helpfulCount: number
  answeredAt: string | null
  createdAt: string
  updatedAt?: string
}

export interface PromoRow {
  id: string
  code: string
  type: string
  value: number
  label: string
  active: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Helpers Firestore
// ---------------------------------------------------------------------------

type FsDoc = Record<string, unknown>

/** Lecture complète d'une collection (petites collections boutique). */
async function colAll(name: string, max = 1000): Promise<FsDoc[]> {
  const fb = getFirebaseAdmin()
  if (!fb) return []
  const snap = await fb.db.collection(name).limit(max).get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as FsDoc) }))
}

async function colGet(name: string, id: string): Promise<FsDoc | null> {
  const fb = getFirebaseAdmin()
  if (!fb) return null
  const snap = await fb.db.collection(name).doc(id).get()
  return snap.exists ? ({ id: snap.id, ...(snap.data() as FsDoc) } as FsDoc) : null
}

async function colAdd(name: string, id: string, data: FsDoc): Promise<void> {
  const fb = getFirebaseAdmin()
  if (!fb) return
  await fb.db.collection(name).doc(id).set(data)
}

async function colUpdate(name: string, id: string, data: FsDoc): Promise<void> {
  const fb = getFirebaseAdmin()
  if (!fb) return
  await fb.db.collection(name).doc(id).update(data)
}

async function colDelete(name: string, id: string): Promise<void> {
  const fb = getFirebaseAdmin()
  if (!fb) return
  await fb.db.collection(name).doc(id).delete()
}

/** Supprime tous les documents d'une collection satisfaisant field == value. */
async function colDeleteWhere(name: string, field: string, value: unknown): Promise<void> {
  const fb = getFirebaseAdmin()
  if (!fb) return
  const snap = await fb.db.collection(name).where(field, '==', value).limit(500).get()
  const batch = fb.db.batch()
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))
const num = (v: unknown, d = 0): number => (typeof v === 'number' && isFinite(v) ? v : Number(v) || d)
const bool = (v: unknown, d = false): boolean => (typeof v === 'boolean' ? v : v == null ? d : Boolean(v))

function fsToCategory(d: FsDoc): CategoryRow {
  return {
    id: str(d.id),
    name: str(d.name),
    slug: str(d.slug),
    description: (d.description as string) ?? null,
    image: (d.image as string) ?? null,
    order: num(d.order),
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  }
}

function fsToProduct(d: FsDoc, categories: Map<string, CategoryRow>): ProductRow {
  const categoryId = (d.categoryId as string) ?? null
  return {
    id: str(d.id),
    name: str(d.name),
    slug: str(d.slug),
    description: (d.description as string) ?? null,
    details: (d.details as string) ?? null,
    price: num(d.price),
    oldPrice: (d.oldPrice as number) ?? null,
    image: str(d.image),
    gallery: str(d.gallery, '[]'),
    categoryId,
    category: categoryId ? categories.get(categoryId) ?? null : null,
    stock: num(d.stock),
    rating: num(d.rating, 4),
    reviewCount: num(d.reviewCount),
    soldCount: num(d.soldCount),
    isFeatured: bool(d.isFeatured),
    isNew: bool(d.isNew),
    isActive: bool(d.isActive, true),
    sizes: str(d.sizes, '[]'),
    colors: str(d.colors, '[]'),
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  }
}

function fsToOrder(d: FsDoc): OrderRow {
  return {
    id: str(d.id),
    orderNumber: str(d.orderNumber),
    userId: (d.userId as string) ?? null,
    customerName: str(d.customerName),
    customerEmail: str(d.customerEmail),
    phone: (d.phone as string) ?? null,
    address: str(d.address),
    city: str(d.city),
    postalCode: (d.postalCode as string) ?? null,
    country: str(d.country, 'France'),
    paymentMethod: str(d.paymentMethod, 'card'),
    shippingMethod: str(d.shippingMethod, 'standard'),
    subtotal: num(d.subtotal),
    shipping: num(d.shipping),
    discount: num(d.discount),
    promoCode: (d.promoCode as string) ?? null,
    total: num(d.total),
    status: str(d.status, 'confirmee'),
    pointsUsed: num(d.pointsUsed),
    notes: (d.notes as string) ?? null,
    items: Array.isArray(d.items) ? (d.items as FsDoc[]).map((it) => fsToOrderItem(it, str(d.id))) : [],
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  }
}

function fsToOrderItem(it: FsDoc, orderId: string): OrderItemRow {
  return {
    id: str(it.id, `${orderId}-it`),
    orderId: str(it.orderId, orderId),
    productId: (it.productId as string) ?? null,
    name: str(it.name),
    price: num(it.price),
    image: (it.image as string) ?? null,
    quantity: num(it.quantity, 1),
  }
}

function fsToReview(d: FsDoc): ReviewRow {
  return {
    id: str(d.id),
    productId: str(d.productId),
    userId: (d.userId as string) ?? null,
    author: str(d.author),
    email: (d.email as string) ?? null,
    rating: num(d.rating, 5),
    title: (d.title as string) ?? null,
    content: str(d.content),
    status: str(d.status, 'pending'),
    helpfulCount: num(d.helpfulCount),
    photos: str(d.photos, '[]'),
    createdAt: str(d.createdAt),
  }
}

function fsToQuestion(d: FsDoc): QuestionRow {
  return {
    id: str(d.id),
    productId: str(d.productId),
    author: str(d.author),
    question: str(d.question),
    answer: (d.answer as string) ?? null,
    status: str(d.status, 'pending'),
    helpfulCount: num(d.helpfulCount),
    answeredAt: (d.answeredAt as string) ?? null,
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  }
}

function fsToPromo(d: FsDoc): PromoRow {
  return {
    id: str(d.id),
    code: str(d.code),
    type: str(d.type, 'percent'),
    value: num(d.value),
    label: str(d.label),
    active: bool(d.active, true),
    usageCount: num(d.usageCount),
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  }
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

const iso = (d: Date | string | null | undefined): string =>
  d instanceof Date ? d.toISOString() : typeof d === 'string' ? d : new Date().toISOString()

function prismaUserToRow(u: {
  id: string
  email: string
  passwordHash: string
  name: string
  role: string
  createdAt: Date
  updatedAt: Date
}): UserRow {
  return {
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    name: u.name,
    role: u.role,
    createdAt: iso(u.createdAt),
    updatedAt: iso(u.updatedAt),
  }
}

/** Utilisateur par email — mode Firebase : Firestore ; sinon Prisma. */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase()
  if (isFirebaseMode()) {
    const users = await colAll('users', 500)
    const hit = users.find((u) => str(u.emailLower ?? u.email).toLowerCase() === normalized)
    return hit ? ({ ...fsUser(hit) } as UserRow) : null
  }
  const u = await db.user.findUnique({ where: { email: normalized } })
  return u ? prismaUserToRow(u) : null
}

/** Compte local historique (SQLite) — sert au re-parenting lors de la bascule. */
export async function findLocalUserByEmail(email: string): Promise<UserRow | null> {
  try {
    const u = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    return u ? prismaUserToRow(u) : null
  } catch {
    return null
  }
}

function fsUser(d: FsDoc): UserRow {
  return {
    id: str(d.id),
    email: str(d.email),
    passwordHash: str(d.passwordHash),
    name: str(d.name),
    role: str(d.role, 'user'),
    firebaseUid: (d.firebaseUid as string) ?? null,
    emailVerified: bool(d.emailVerified),
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  }
}

export async function findUserById(id: string): Promise<UserRow | null> {
  if (isFirebaseMode()) {
    const d = await colGet('users', id)
    return d ? fsUser(d) : null
  }
  const u = await db.user.findUnique({ where: { id } })
  return u ? prismaUserToRow(u) : null
}

interface CreateUserData {
  id?: string
  name: string
  email: string
  passwordHash: string
  role?: 'admin' | 'user'
  firebaseUid?: string | null
  emailVerified?: boolean
}

/** Création de compte. En mode Firebase : Firestore (source) + miroir local silencieux. */
export async function createUser(data: CreateUserData): Promise<UserRow> {
  const id = data.id ?? fbId()
  const email = data.email.trim().toLowerCase()
  const row: UserRow = {
    id,
    email,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role ?? 'user',
    firebaseUid: data.firebaseUid ?? null,
    emailVerified: data.emailVerified ?? false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  if (isFirebaseMode()) {
    await colAdd('users', id, { ...row, emailLower: email })
    // Miroir best-effort dans SQLite (cohérence si bascule inverse)
    db.user
      .upsert({
        where: { id },
        create: {
          id,
          email,
          passwordHash: data.passwordHash,
          name: data.name,
          role: row.role,
          supabaseUserId: row.firebaseUid ?? null,
        },
        update: { supabaseUserId: row.firebaseUid ?? null },
      })
      .catch(() => {})
    return row
  }
  const created = await db.user.create({
    data: {
      id,
      name: data.name,
      email,
      passwordHash: data.passwordHash,
      role: row.role,
    },
  })
  return prismaUserToRow(created)
}

/**
 * Garantit un profil Firestore pour un compte Auth existant (re-parenting) :
 *  1. profil Firestore déjà présent → mis à jour (uid) et retourné ;
 *  2. sinon compte local historique → MÊME id (les commandes restent liées) ;
 *  3. sinon création d'un nouveau profil.
 */
export async function ensureFirebaseProfile(input: {
  email: string
  name?: string
  role?: 'admin' | 'user'
  firebaseUid: string
  passwordHash?: string
  emailVerified?: boolean
}): Promise<UserRow> {
  const email = input.email.trim().toLowerCase()
  const users = await colAll('users', 500)
  const hit = users.find((u) => str(u.emailLower ?? u.email).toLowerCase() === email)
  if (hit) {
    const row = fsUser(hit)
    const patch: FsDoc = { firebaseUid: input.firebaseUid, updatedAt: nowISO() }
    if (input.emailVerified !== undefined) patch.emailVerified = input.emailVerified
    await colUpdate('users', row.id, patch)
    return { ...row, firebaseUid: input.firebaseUid }
  }
  const local = await findLocalUserByEmail(email)
  const row: UserRow = {
    id: local?.id ?? fbId(),
    email,
    passwordHash: local?.passwordHash ?? '',
    name: input.name ?? local?.name ?? 'Client',
    role: input.role ?? local?.role ?? 'user',
    firebaseUid: input.firebaseUid,
    emailVerified: input.emailVerified ?? true,
    createdAt: local?.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  }
  await colAdd('users', row.id, { ...row, emailLower: email })
  return row
}

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<CategoryRow[]> {
  if (isFirebaseMode()) {
    const [cats, products] = await Promise.all([colAll('categories', 200), colAll('products', 1000)])
    const rows = cats.map(fsToCategory).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    return rows.map((c) => ({ ...c, productCount: products.filter((p) => p.categoryId === c.id).length }))
  }
  const cats = await db.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  })
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    order: c.order,
    productCount: c._count.products,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  }))
}

export async function createCategory(data: {
  name: string
  slug: string
  description?: string | null
  image?: string | null
  order?: number
}): Promise<CategoryRow> {
  if (isFirebaseMode()) {
    const row: CategoryRow = {
      id: fbId(),
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      image: data.image ?? null,
      order: data.order ?? 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    await colAdd('categories', row.id, row as unknown as FsDoc)
    return row
  }
  const created = await db.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      image: data.image ?? null,
      order: data.order ?? 0,
    },
  })
  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description: created.description,
    image: created.image,
    order: created.order,
    createdAt: iso(created.createdAt),
    updatedAt: iso(created.updatedAt),
  }
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string | null; image?: string | null; order?: number },
): Promise<void> {
  if (isFirebaseMode()) {
    const patch: FsDoc = { updatedAt: nowISO() }
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.image !== undefined) patch.image = data.image
    if (data.order !== undefined) patch.order = data.order
    await colUpdate('categories', id, patch)
    return
  }
  const d: Record<string, unknown> = {}
  if (data.name !== undefined) d.name = data.name
  if (data.description !== undefined) d.description = data.description
  if (data.image !== undefined) d.image = data.image
  if (data.order !== undefined) d.order = data.order
  await db.category.update({ where: { id }, data: d })
}

export async function deleteCategory(id: string): Promise<void> {
  if (isFirebaseMode()) {
    const products = await colAll('products', 1000)
    for (const p of products.filter((x) => x.categoryId === id)) {
      await colUpdate('products', str(p.id), { categoryId: null, updatedAt: nowISO() })
    }
    await colDelete('categories', id)
    return
  }
  const products = await db.product.findMany({ where: { categoryId: id } })
  for (const p of products) {
    await db.product.update({ where: { id: p.id }, data: { categoryId: null } })
  }
  await db.category.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// PRODUCTS
// ---------------------------------------------------------------------------

async function fbCategoriesMap(): Promise<Map<string, CategoryRow>> {
  const cats = await colAll('categories', 200)
  return new Map(cats.map((c) => [str(c.id), fsToCategory(c)]))
}

export interface ProductFilters {
  category?: string | null // slug
  search?: string | null
  featured?: boolean
  promo?: boolean
  sort?: string
  minPrice?: number | null
  maxPrice?: number | null
  includeInactive?: boolean
}

export async function listProducts(f: ProductFilters = {}): Promise<ProductRow[]> {
  if (isFirebaseMode()) {
    const [docs, cats] = await Promise.all([colAll('products', 1000), fbCategoriesMap()])
    let rows = docs.map((d) => fsToProduct(d, cats))
    if (!f.includeInactive) rows = rows.filter((p) => p.isActive)
    if (f.category && f.category !== 'all') {
      rows = rows.filter((p) => p.category?.slug === f.category)
    }
    if (f.featured) rows = rows.filter((p) => p.isFeatured)
    if (f.promo) rows = rows.filter((p) => p.oldPrice != null)
    if (f.search) {
      const s = f.search.toLowerCase()
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s),
      )
    }
    if (f.minPrice != null) rows = rows.filter((p) => p.price >= f.minPrice!)
    if (f.maxPrice != null) rows = rows.filter((p) => p.price <= f.maxPrice!)
    const byDate = (a: ProductRow, b: ProductRow) => b.createdAt.localeCompare(a.createdAt)
    switch (f.sort) {
      case 'price-asc':
        rows.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        rows.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        rows.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
        break
      case 'sold':
        rows.sort((a, b) => b.soldCount - a.soldCount || b.reviewCount - a.reviewCount)
        break
      default:
        rows.sort(byDate)
    }
    return rows
  }
  const where: Record<string, unknown> = {}
  if (!f.includeInactive) where.isActive = true
  if (f.category && f.category !== 'all') where.category = { slug: f.category }
  if (f.featured) where.isFeatured = true
  if (f.promo) where.oldPrice = { not: null }
  if (f.search) {
    where.OR = [{ name: { contains: f.search } }, { description: { contains: f.search } }]
  }
  if (f.minPrice != null || f.maxPrice != null) {
    where.price = {}
    if (f.minPrice != null) (where.price as Record<string, unknown>).gte = f.minPrice
    if (f.maxPrice != null) (where.price as Record<string, unknown>).lte = f.maxPrice
  }
  let orderBy: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[] = { createdAt: 'desc' }
  if (f.sort === 'price-asc') orderBy = { price: 'asc' }
  else if (f.sort === 'price-desc') orderBy = { price: 'desc' }
  else if (f.sort === 'rating') orderBy = [{ rating: 'desc' }, { reviewCount: 'desc' }]
  else if (f.sort === 'sold') orderBy = [{ soldCount: 'desc' }, { reviewCount: 'desc' }]
  const rows = await db.product.findMany({ where, orderBy, include: { category: true } })
  return rows.map((p) => ({
    ...p,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  })) as unknown as ProductRow[]
}

export async function getProductsByIds(ids: string[]): Promise<ProductRow[]> {
  if (ids.length === 0) return []
  if (isFirebaseMode()) {
    const [docs, cats] = await Promise.all([colAll('products', 1000), fbCategoriesMap()])
    const set = new Set(ids)
    return docs.filter((d) => set.has(str(d.id))).map((d) => fsToProduct(d, cats))
  }
  const rows = await db.product.findMany({ where: { id: { in: ids } }, include: { category: true } })
  return rows.map((p) => ({ ...p, createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt) })) as unknown as ProductRow[]
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  if (isFirebaseMode()) {
    const d = await colGet('products', id)
    if (!d) return null
    const cats = await fbCategoriesMap()
    return fsToProduct(d, cats)
  }
  const p = await db.product.findUnique({ where: { id }, include: { category: true } })
  return p ? ({ ...p, createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt) } as unknown as ProductRow) : null
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  if (isFirebaseMode()) {
    const fb = getFirebaseAdmin()
    if (!fb) return null
    const snap = await fb.db.collection('products').where('slug', '==', slug).limit(1).get()
    if (snap.empty) return null
    const cats = await fbCategoriesMap()
    return fsToProduct({ id: snap.docs[0].id, ...(snap.docs[0].data() as FsDoc) }, cats)
  }
  const p = await db.product.findUnique({ where: { slug }, include: { category: true } })
  return p ? ({ ...p, createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt) } as unknown as ProductRow) : null
}

export interface ProductInput {
  name: string
  slug: string
  description?: string | null
  details?: string | null
  price: number
  oldPrice?: number | null
  image: string
  gallery?: string
  categoryId?: string | null
  stock?: number
  rating?: number
  reviewCount?: number
  soldCount?: number
  isFeatured?: boolean
  isNew?: boolean
  isActive?: boolean
  sizes?: string
  colors?: string
}

export async function createProduct(data: ProductInput): Promise<ProductRow> {
  if (isFirebaseMode()) {
    const cats = await fbCategoriesMap()
    const row: ProductRow = {
      id: fbId(),
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      details: data.details ?? null,
      price: data.price,
      oldPrice: data.oldPrice ?? null,
      image: data.image,
      gallery: data.gallery ?? JSON.stringify([data.image]),
      categoryId: data.categoryId ?? null,
      category: data.categoryId ? cats.get(data.categoryId) ?? null : null,
      stock: data.stock ?? 0,
      rating: data.rating ?? 4,
      reviewCount: data.reviewCount ?? 0,
      soldCount: data.soldCount ?? 0,
      isFeatured: data.isFeatured ?? false,
      isNew: data.isNew ?? false,
      isActive: data.isActive ?? true,
      sizes: data.sizes ?? '[]',
      colors: data.colors ?? '[]',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    await colAdd('products', row.id, row as unknown as FsDoc)
    await colAdd('priceHistory', fbId(), {
      productId: row.id,
      price: row.price,
      oldPrice: row.oldPrice,
      createdAt: nowISO(),
    })
    return row
  }
  const created = await db.product.create({ data: { ...data } as never, include: { category: true } })
  await db.priceHistory.create({
    data: { productId: created.id, price: created.price, oldPrice: created.oldPrice },
  })
  return { ...created, createdAt: iso(created.createdAt), updatedAt: iso(created.updatedAt) } as unknown as ProductRow
}

export async function updateProduct(
  id: string,
  data: Partial<ProductInput>,
): Promise<ProductRow | null> {
  if (isFirebaseMode()) {
    const current = await colGet('products', id)
    if (!current) return null
    const cats = await fbCategoriesMap()
    const priceChanged = data.price !== undefined && data.price !== null
    const patch: FsDoc = { updatedAt: nowISO() }
    for (const k of ['name', 'description', 'details', 'image', 'gallery', 'sizes', 'colors'] as const) {
      if (data[k] !== undefined) patch[k] = data[k] as unknown
    }
    if (data.price !== undefined) patch.price = data.price
    if (data.oldPrice !== undefined) patch.oldPrice = data.oldPrice
    if (data.stock !== undefined) patch.stock = data.stock
    if (data.categoryId !== undefined) {
      patch.categoryId = data.categoryId
      patch.category = data.categoryId ? cats.get(data.categoryId) ?? null : null
    }
    if (data.isFeatured !== undefined) patch.isFeatured = data.isFeatured
    if (data.isNew !== undefined) patch.isNew = data.isNew
    if (data.isActive !== undefined) patch.isActive = data.isActive
    await colUpdate('products', id, patch)
    const updated = await colGet('products', id)
    const row = updated ? fsToProduct(updated, cats) : null
    if (row && priceChanged) {
      await colAdd('priceHistory', fbId(), {
        productId: id,
        price: row.price,
        oldPrice: row.oldPrice,
        createdAt: nowISO(),
      })
    }
    return row
  }
  const d: Record<string, unknown> = { ...data }
  const prevPriceChanged =
    data.price !== undefined && data.price !== null
      ? await db.product.findUnique({ where: { id }, select: { price: true, oldPrice: true } })
      : null
  if (data.price !== undefined && data.price !== null && prevPriceChanged) {
    if (
      prevPriceChanged.price === data.price &&
      prevPriceChanged.oldPrice === (data.oldPrice ?? prevPriceChanged.oldPrice)
    ) {
      delete d.price
    }
  }
  const updated = await db.product.update({ where: { id }, data: d, include: { category: true } })
  if (
    prevPriceChanged &&
    (updated.price !== prevPriceChanged.price || updated.oldPrice !== prevPriceChanged.oldPrice)
  ) {
    await db.priceHistory.create({
      data: { productId: id, price: updated.price, oldPrice: updated.oldPrice },
    })
  }
  return { ...updated, createdAt: iso(updated.createdAt), updatedAt: iso(updated.updatedAt) } as unknown as ProductRow
}

export async function deleteProduct(id: string): Promise<void> {
  if (isFirebaseMode()) {
    await colDeleteWhere('reviews', 'productId', id)
    await colDeleteWhere('questions', 'productId', id)
    await colDeleteWhere('priceHistory', 'productId', id)
    await colDeleteWhere('cartItems', 'productId', id)
    await colDelete('products', id)
    return
  }
  await db.review.deleteMany({ where: { productId: id } })
  await db.product.delete({ where: { id } })
}

export interface PricePoint {
  price: number
  oldPrice: number | null
  createdAt: string
}

export async function listPriceHistory(productId: string): Promise<PricePoint[]> {
  if (isFirebaseMode()) {
    const rows = await colAll('priceHistory', 1000)
    return rows
      .filter((r) => r.productId === productId)
      .map((r) => ({ price: num(r.price), oldPrice: (r.oldPrice as number) ?? null, createdAt: str(r.createdAt) }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  const rows = await db.priceHistory.findMany({
    where: { productId },
    orderBy: { createdAt: 'asc' },
    select: { price: true, oldPrice: true, createdAt: true },
  })
  return rows.map((r) => ({ price: r.price, oldPrice: r.oldPrice, createdAt: iso(r.createdAt) }))
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------

export interface CreateOrderData {
  orderNumber: string
  userId: string
  customerName: string
  customerEmail: string
  phone: string | null
  address: string
  city: string
  postalCode: string | null
  country: string
  paymentMethod: string
  shippingMethod: string
  subtotal: number
  shipping: number
  discount: number
  promoCode: string | null
  promoId?: string | null
  total: number
  status: string
  pointsUsed: number
  notes: string | null
  items: { productId: string; name: string; price: number; image: string | null; quantity: number }[]
}

/** Création transactionnelle : décrément de stock contrôlé + commande + usage promo. */
export async function createOrderWithStock(data: CreateOrderData): Promise<OrderRow> {
  if (isFirebaseMode()) {
    const fb = getFirebaseAdmin()
    if (!fb) throw new Error('Firebase indisponible')
    const created = await fb.db.runTransaction(async (tx) => {
      const updates: { ref: ReturnType<typeof fb.db.doc>; stock: number; sold: number }[] = []
      for (const it of data.items) {
        const ref = fb.db.collection('products').doc(it.productId)
        const snap = await tx.get(ref)
        if (!snap.exists) throw new Error(`STOCK:${it.name}`)
        const p = snap.data() as FsDoc
        const stock = num(p.stock)
        if (stock < it.quantity) throw new Error(`STOCK:${it.name}`)
        updates.push({ ref, stock: stock - it.quantity, sold: num(p.soldCount) + it.quantity })
      }
      updates.forEach((u) => tx.update(u.ref, { stock: u.stock, soldCount: u.sold, updatedAt: nowISO() }))
      const id = fbId()
      const orderRef = fb.db.collection('orders').doc(id)
      const order: OrderRow = {
        id,
        orderNumber: data.orderNumber,
        userId: data.userId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        paymentMethod: data.paymentMethod,
        shippingMethod: data.shippingMethod,
        subtotal: data.subtotal,
        shipping: data.shipping,
        discount: data.discount,
        promoCode: data.promoCode,
        total: data.total,
        status: data.status,
        pointsUsed: data.pointsUsed,
        notes: data.notes,
        items: data.items.map((it, i) => ({ id: `${id}-it${i}`, orderId: id, ...it })),
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      tx.set(orderRef, order as unknown as FsDoc)
      if (data.promoId) {
        const promoRef = fb.db.collection('promoCodes').doc(data.promoId)
        const promoSnap = await tx.get(promoRef)
        if (promoSnap.exists) {
          tx.update(promoRef, { usageCount: num((promoSnap.data() as FsDoc).usageCount) + 1 })
        }
      }
      return order
    })
    return created
  }
  const created = await db.$transaction(async (tx) => {
    for (const it of data.items) {
      const res = await tx.product.updateMany({
        where: { id: it.productId, stock: { gte: it.quantity } },
        data: { stock: { decrement: it.quantity }, soldCount: { increment: it.quantity } },
      })
      if (res.count === 0) throw new Error(`STOCK:${it.name}`)
    }
    return tx.order.create({
      data: {
        orderNumber: data.orderNumber,
        userId: data.userId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        paymentMethod: data.paymentMethod,
        shippingMethod: data.shippingMethod,
        subtotal: data.subtotal,
        shipping: data.shipping,
        discount: data.discount,
        promoCode: data.promoCode,
        total: data.total,
        status: data.status,
        pointsUsed: data.pointsUsed,
        notes: data.notes,
        items: { create: data.items },
      },
      include: { items: true },
    })
  })
  return { ...created, createdAt: iso(created.createdAt), updatedAt: iso(created.updatedAt) } as unknown as OrderRow
}

export interface OrderFilters {
  email?: string | null
  status?: string | null
  orderNumber?: string | null
  search?: string | null
  scopedUserId?: string | null
  scopedUserEmail?: string | null
  take?: number
}

export async function listOrders(f: OrderFilters = {}): Promise<OrderRow[]> {
  if (isFirebaseMode()) {
    const rows = (await colAll('orders', 1000)).map(fsToOrder)
    let out = rows
    if (f.email) out = out.filter((o) => o.customerEmail.toLowerCase() === f.email!.toLowerCase())
    if (f.status) out = out.filter((o) => o.status === f.status)
    if (f.orderNumber) out = out.filter((o) => o.orderNumber === f.orderNumber)
    else if (f.search) out = out.filter((o) => o.orderNumber.includes(f.search!))
    if (f.scopedUserId || f.scopedUserEmail) {
      out = out.filter(
        (o) =>
          (f.scopedUserId && o.userId === f.scopedUserId) ||
          (f.scopedUserEmail && o.customerEmail.toLowerCase() === f.scopedUserEmail!.toLowerCase()),
      )
    }
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return out.slice(0, f.take ?? 200)
  }
  const where: Record<string, unknown> = {}
  if (f.email) where.customerEmail = f.email
  if (f.status) where.status = f.status
  if (f.orderNumber) where.orderNumber = f.orderNumber
  else if (f.search) where.orderNumber = { contains: f.search }
  if (f.scopedUserId || f.scopedUserEmail) {
    where.OR = [{ userId: f.scopedUserId }, { customerEmail: f.scopedUserEmail }]
  }
  const rows = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { items: true },
    take: f.take ?? 200,
  })
  return rows.map((o) => ({ ...o, createdAt: iso(o.createdAt), updatedAt: iso(o.updatedAt) })) as unknown as OrderRow[]
}

export async function getOrderByIdOrNumber(
  id: string,
): Promise<{ order: OrderRow | null; byNumber: boolean }> {
  const asNumber = id.toUpperCase()
  if (isFirebaseMode()) {
    const direct = await colGet('orders', id)
    if (direct) return { order: fsToOrder(direct), byNumber: false }
    const rows = (await colAll('orders', 1000)).map(fsToOrder)
    const hit = rows.find((o) => o.orderNumber === asNumber)
    return { order: hit ?? null, byNumber: Boolean(hit) }
  }
  let order = await db.order.findUnique({ where: { id }, include: { items: true } })
  let byNumber = false
  if (!order) {
    order = await db.order.findFirst({
      where: { orderNumber: { equals: asNumber } },
      include: { items: true },
    })
    byNumber = Boolean(order)
  }
  return {
    order: order
      ? ({ ...order, createdAt: iso(order.createdAt), updatedAt: iso(order.updatedAt) } as unknown as OrderRow)
      : null,
    byNumber,
  }
}

export async function updateOrder(
  id: string,
  data: { status?: string; notes?: string | null },
): Promise<OrderRow | null> {
  if (isFirebaseMode()) {
    const patch: FsDoc = { updatedAt: nowISO() }
    if (data.status !== undefined) patch.status = data.status
    if (data.notes !== undefined) patch.notes = data.notes
    await colUpdate('orders', id, patch)
    const d = await colGet('orders', id)
    return d ? fsToOrder(d) : null
  }
  const updated = await db.order.update({ where: { id }, data, include: { items: true } })
  return { ...updated, createdAt: iso(updated.createdAt), updatedAt: iso(updated.updatedAt) } as unknown as OrderRow
}

// ---------------------------------------------------------------------------
// CART (panier persisté par compte — Collection Cart de l'original Base44)
// ---------------------------------------------------------------------------

const cartDocId = (userId: string, productId: string, variantKey: string) =>
  `${userId}__${productId}__${variantKey}`

export interface CartLine {
  productId: string
  name: string
  price: number
  oldPrice: number | null
  image: string
  quantity: number
  size: string | null
  color: string | null
}

/** Lecture du panier : prix TOUJOURS relu depuis les produits (jamais mémorisé). */
export async function listCart(userId: string): Promise<CartLine[]> {
  if (isFirebaseMode()) {
    const [items, products] = await Promise.all([colAll('cartItems', 1000), colAll('products', 1000)])
    const byId = new Map(products.map((p) => [str(p.id), p]))
    const lines: CartLine[] = []
    const mine = items
      .filter((it) => it.userId === userId)
      .sort((a, b) => str(a.createdAt).localeCompare(str(b.createdAt)))
    for (const it of mine) {
      const p = byId.get(str(it.productId))
      if (!p || !bool(p.isActive, true)) continue
      const vk = str(it.variantKey, '|').split('|')
      lines.push({
        productId: str(it.productId),
        name: str(p.name),
        price: num(p.price),
        oldPrice: (p.oldPrice as number) ?? null,
        image: str(p.image),
        quantity: num(it.quantity, 1),
        size: vk[0] || null,
        color: vk[1] || null,
      })
    }
    return lines
  }
  const rows = await db.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      product: { select: { id: true, name: true, price: true, oldPrice: true, image: true, isActive: true, stock: true } },
    },
  })
  return rows
    .filter((r) => r.product && r.product.isActive)
    .map((r) => ({
      productId: r.product.id,
      name: r.product.name,
      price: r.product.price,
      oldPrice: r.product.oldPrice,
      image: r.product.image,
      quantity: r.quantity,
      size: r.variantKey.split('|')[0] || null,
      color: r.variantKey.split('|')[1] || null,
    }))
}

export async function upsertCartItem(input: {
  userId: string
  productId: string
  variantKey: string
  quantity: number
}): Promise<void> {
  if (isFirebaseMode()) {
    const id = cartDocId(input.userId, input.productId, input.variantKey)
    const existing = await colGet('cartItems', id)
    await colAdd('cartItems', id, {
      userId: input.userId,
      productId: input.productId,
      variantKey: input.variantKey,
      quantity: input.quantity,
      createdAt: existing ? str(existing.createdAt) : nowISO(),
      updatedAt: nowISO(),
    })
    return
  }
  await db.cartItem.upsert({
    where: {
      userId_productId_variantKey: {
        userId: input.userId,
        productId: input.productId,
        variantKey: input.variantKey,
      },
    },
    create: { userId: input.userId, productId: input.productId, variantKey: input.variantKey, quantity: input.quantity },
    update: { quantity: input.quantity },
  })
}

export async function findCartItem(userId: string, productId: string, variantKey: string): Promise<number | null> {
  if (isFirebaseMode()) {
    const d = await colGet('cartItems', cartDocId(userId, productId, variantKey))
    return d ? num(d.quantity) : null
  }
  const d = await db.cartItem.findUnique({
    where: { userId_productId_variantKey: { userId, productId, variantKey } },
    select: { quantity: true },
  })
  return d?.quantity ?? null
}

export async function deleteCartItems(
  userId: string,
  target: { productId?: string; variantKey?: string } | 'all',
): Promise<void> {
  if (isFirebaseMode()) {
    if (target === 'all') {
      await colDeleteWhere('cartItems', 'userId', userId)
      return
    }
    const id = cartDocId(userId, target.productId ?? '', target.variantKey ?? '|')
    await colDelete('cartItems', id)
    return
  }
  if (target === 'all') {
    await db.cartItem.deleteMany({ where: { userId } })
  } else {
    await db.cartItem.deleteMany({
      where: { userId, productId: target.productId, variantKey: target.variantKey },
    })
  }
}

// ---------------------------------------------------------------------------
// PROMO CODES
// ---------------------------------------------------------------------------

export async function findPromoByCode(code: string): Promise<PromoRow | null> {
  const normalized = code.trim().toUpperCase()
  if (isFirebaseMode()) {
    const rows = await colAll('promoCodes', 200)
    const hit = rows.find((r) => str(r.code).toUpperCase() === normalized)
    return hit ? fsToPromo(hit) : null
  }
  const found = await db.promoCode.findUnique({ where: { code: normalized } })
  return found
    ? {
        id: found.id,
        code: found.code,
        type: found.type,
        value: found.value,
        label: found.label,
        active: found.active,
        usageCount: found.usageCount,
        createdAt: iso(found.createdAt),
        updatedAt: iso(found.updatedAt),
      }
    : null
}

export async function incrementPromoUsage(id: string): Promise<void> {
  if (isFirebaseMode()) {
    const d = await colGet('promoCodes', id)
    if (d) await colUpdate('promoCodes', id, { usageCount: num(d.usageCount) + 1, updatedAt: nowISO() })
    return
  }
  await db.promoCode.update({ where: { id }, data: { usageCount: { increment: 1 } } }).catch(() => {})
}

export async function listPromoCodes(): Promise<PromoRow[]> {
  if (isFirebaseMode()) {
    const rows = await colAll('promoCodes', 200)
    return rows.map(fsToPromo).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const rows = await db.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    type: r.type,
    value: r.value,
    label: r.label,
    active: r.active,
    usageCount: r.usageCount,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  }))
}

export async function createPromoCode(data: {
  code: string
  type: string
  value: number
  label: string
}): Promise<PromoRow> {
  if (isFirebaseMode()) {
    const row: PromoRow = {
      id: fbId(),
      code: data.code,
      type: data.type,
      value: data.value,
      label: data.label,
      active: true,
      usageCount: 0,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    await colAdd('promoCodes', row.id, row as unknown as FsDoc)
    return row
  }
  const created = await db.promoCode.create({ data: { code: data.code, type: data.type, value: data.value, label: data.label } })
  return {
    id: created.id,
    code: created.code,
    type: created.type,
    value: created.value,
    label: created.label,
    active: created.active,
    usageCount: created.usageCount,
    createdAt: iso(created.createdAt),
    updatedAt: iso(created.updatedAt),
  }
}

export async function updatePromoCode(
  id: string,
  data: { code?: string; label?: string; value?: number; type?: string; active?: boolean },
): Promise<PromoRow | null> {
  if (isFirebaseMode()) {
    const patch: FsDoc = { updatedAt: nowISO() }
    if (data.code !== undefined) patch.code = data.code
    if (data.label !== undefined) patch.label = data.label
    if (data.value !== undefined) patch.value = data.value
    if (data.type !== undefined) patch.type = data.type
    if (data.active !== undefined) patch.active = data.active
    await colUpdate('promoCodes', id, patch)
    const d = await colGet('promoCodes', id)
    return d ? fsToPromo(d) : null
  }
  const updated = await db.promoCode.update({ where: { id }, data })
  return {
    id: updated.id,
    code: updated.code,
    type: updated.type,
    value: updated.value,
    label: updated.label,
    active: updated.active,
    usageCount: updated.usageCount,
    createdAt: iso(updated.createdAt),
    updatedAt: iso(updated.updatedAt),
  }
}

export async function deletePromoCode(id: string): Promise<void> {
  if (isFirebaseMode()) return colDelete('promoCodes', id)
  await db.promoCode.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// REVIEWS
// ---------------------------------------------------------------------------

export async function listReviews(f: { productId?: string | null; status?: string | null }): Promise<ReviewRow[]> {
  if (isFirebaseMode()) {
    const [docs, products] = await Promise.all([colAll('reviews', 1000), colAll('products', 1000)])
    const byId = new Map(products.map((p) => [str(p.id), { id: str(p.id), name: str(p.name), image: str(p.image) }]))
    let rows = docs.map(fsToReview)
    if (f.productId) rows = rows.filter((r) => r.productId === f.productId)
    if (f.status) rows = rows.filter((r) => r.status === f.status)
    rows = rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r, product: byId.get(r.productId) ?? null }))
    return rows
  }
  const where: Record<string, unknown> = {}
  if (f.productId) where.productId = f.productId
  if (f.status) where.status = f.status
  const rows = await db.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { id: true, name: true, image: true } } },
  })
  return rows.map((r) => ({
    ...r,
    photos: (r as unknown as { photos?: string }).photos ?? '[]',
    helpfulCount: (r as unknown as { helpfulCount?: number }).helpfulCount ?? 0,
    createdAt: iso(r.createdAt),
  })) as unknown as ReviewRow[]
}

export async function createReview(data: {
  productId: string
  userId: string
  author: string
  email: string
  rating: number
  title: string | null
  content: string
  photos: string
  status: string
}): Promise<ReviewRow> {
  const row: ReviewRow = {
    id: isFirebaseMode() ? fbId() : randomUUID(),
    productId: data.productId,
    userId: data.userId,
    author: data.author,
    email: data.email,
    rating: data.rating,
    title: data.title,
    content: data.content,
    status: data.status,
    helpfulCount: 0,
    photos: data.photos,
    createdAt: nowISO(),
  }
  if (isFirebaseMode()) {
    await colAdd('reviews', row.id, row as unknown as FsDoc)
  } else {
    const created = await db.review.create({ data: { ...data, title: data.title, photos: data.photos } })
    row.id = created.id
    row.createdAt = iso(created.createdAt)
  }
  return row
}

/** Recalcule la note moyenne d'un produit depuis ses avis approuvés. */
export async function refreshProductRating(productId: string, bumpCount: boolean): Promise<void> {
  const approved = await listReviews({ productId, status: 'approved' })
  if (approved.length === 0) return
  const avg = Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10
  if (isFirebaseMode()) {
    const d = await colGet('products', productId)
    if (!d) return
    await colUpdate('products', productId, {
      rating: avg,
      reviewCount: num(d.reviewCount) + (bumpCount ? 1 : 0),
      updatedAt: nowISO(),
    })
    return
  }
  await db.product.update({
    where: { id: productId },
    data: { rating: avg, ...(bumpCount ? { reviewCount: { increment: 1 } } : {}) },
  })
}

export async function updateReviewStatus(id: string, status: string): Promise<ReviewRow | null> {
  if (isFirebaseMode()) {
    await colUpdate('reviews', id, { status })
    const d = await colGet('reviews', id)
    return d ? fsToReview(d) : null
  }
  const updated = await db.review.update({ where: { id }, data: { status } })
  return { ...updated, createdAt: iso(updated.createdAt) } as unknown as ReviewRow
}

export async function deleteReview(id: string): Promise<void> {
  if (isFirebaseMode()) return colDelete('reviews', id)
  await db.review.delete({ where: { id } })
}

export async function voteReview(id: string): Promise<number> {
  if (isFirebaseMode()) {
    const d = await colGet('reviews', id)
    if (!d) return 0
    const next = num(d.helpfulCount) + 1
    await colUpdate('reviews', id, { helpfulCount: next })
    return next
  }
  const updated = await db.review.update({
    where: { id },
    data: { helpfulCount: { increment: 1 } },
    select: { helpfulCount: true },
  })
  return updated.helpfulCount
}

export async function reviewExists(id: string): Promise<boolean> {
  if (isFirebaseMode()) return Boolean(await colGet('reviews', id))
  const r = await db.review.findUnique({ where: { id }, select: { id: true } })
  return Boolean(r)
}

// ---------------------------------------------------------------------------
// QUESTIONS PRODUITS
// ---------------------------------------------------------------------------

export async function listQuestions(f: {
  productId?: string | null
  status?: string | null
}): Promise<QuestionRow[]> {
  if (isFirebaseMode()) {
    const [docs, products] = await Promise.all([colAll('questions', 1000), colAll('products', 1000)])
    const byId = new Map(products.map((p) => [str(p.id), { id: str(p.id), name: str(p.name), image: str(p.image) }]))
    let rows = docs.map(fsToQuestion)
    if (f.productId) rows = rows.filter((q) => q.productId === f.productId)
    if (f.status && f.status !== 'all') rows = rows.filter((q) => q.status === f.status)
    return rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100)
      .map((q) => ({ ...q, product: byId.get(q.productId) ?? null }))
  }
  const where: Record<string, string> = {}
  if (f.productId) where.productId = f.productId
  if (f.status && f.status !== 'all') where.status = f.status
  const rows = await db.productQuestion.findMany({
    where,
    include: { product: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return rows.map((q) => ({
    ...q,
    helpfulCount: (q as unknown as { helpfulCount?: number }).helpfulCount ?? 0,
    createdAt: iso(q.createdAt),
    updatedAt: iso(q.updatedAt),
  })) as unknown as QuestionRow[]
}

export async function createQuestion(data: {
  productId: string
  author: string
  question: string
  status: string
}): Promise<QuestionRow> {
  const row: QuestionRow = {
    id: isFirebaseMode() ? fbId() : randomUUID(),
    productId: data.productId,
    author: data.author,
    question: data.question,
    answer: null,
    status: data.status,
    helpfulCount: 0,
    answeredAt: null,
    createdAt: nowISO(),
  }
  if (isFirebaseMode()) {
    await colAdd('questions', row.id, row as unknown as FsDoc)
  } else {
    const created = await db.productQuestion.create({
      data: { productId: data.productId, author: data.author, question: data.question, status: data.status },
    })
    row.id = created.id
    row.createdAt = iso(created.createdAt)
  }
  return row
}

export async function updateQuestion(
  id: string,
  data: { answer?: string; status?: string; answeredAt?: string | null },
): Promise<QuestionRow | null> {
  if (isFirebaseMode()) {
    const patch: FsDoc = { updatedAt: nowISO() }
    if (data.answer !== undefined) patch.answer = data.answer
    if (data.status !== undefined) patch.status = data.status
    if (data.answeredAt !== undefined) patch.answeredAt = data.answeredAt
    await colUpdate('questions', id, patch)
    const d = await colGet('questions', id)
    return d ? fsToQuestion(d) : null
  }
  const d: Record<string, unknown> = {}
  if (data.answer !== undefined) d.answer = data.answer
  if (data.status !== undefined) d.status = data.status
  if (data.answeredAt !== undefined) d.answeredAt = data.answeredAt ? new Date(data.answeredAt) : null
  const updated = await db.productQuestion.update({ where: { id }, data: d })
  return {
    ...updated,
    helpfulCount: (updated as unknown as { helpfulCount?: number }).helpfulCount ?? 0,
    createdAt: iso(updated.createdAt),
    updatedAt: iso(updated.updatedAt),
  } as unknown as QuestionRow
}

export async function deleteQuestion(id: string): Promise<void> {
  if (isFirebaseMode()) return colDelete('questions', id)
  await db.productQuestion.delete({ where: { id } })
}

export async function voteQuestion(id: string): Promise<number> {
  if (isFirebaseMode()) {
    const d = await colGet('questions', id)
    if (!d) return 0
    const next = num(d.helpfulCount) + 1
    await colUpdate('questions', id, { helpfulCount: next })
    return next
  }
  const updated = await db.productQuestion.update({
    where: { id },
    data: { helpfulCount: { increment: 1 } },
    select: { helpfulCount: true },
  })
  return updated.helpfulCount
}

export async function questionExists(id: string): Promise<boolean> {
  if (isFirebaseMode()) return Boolean(await colGet('questions', id))
  const q = await db.productQuestion.findUnique({ where: { id }, select: { id: true } })
  return Boolean(q)
}

// ---------------------------------------------------------------------------
// CONTACT & NEWSLETTER
// ---------------------------------------------------------------------------

export async function createContactMessage(data: {
  name: string
  email: string
  subject: string | null
  message: string
}): Promise<{ id: string }> {
  if (isFirebaseMode()) {
    const id = fbId()
    await colAdd('contactMessages', id, { ...data, isRead: false, createdAt: nowISO() })
    return { id }
  }
  const created = await db.contactMessage.create({ data })
  return { id: created.id }
}

export async function listContactMessages(): Promise<
  { id: string; name: string; email: string; subject: string | null; message: string; isRead: boolean; createdAt: string }[]
> {
  if (isFirebaseMode()) {
    const rows = await colAll('contactMessages', 500)
    return rows
      .map((r) => ({
        id: str(r.id),
        name: str(r.name),
        email: str(r.email),
        subject: (r.subject as string) ?? null,
        message: str(r.message),
        isRead: bool(r.isRead),
        createdAt: str(r.createdAt),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const rows = await db.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    isRead: r.isRead,
    createdAt: iso(r.createdAt),
  }))
}

export async function updateContactMessage(id: string, isRead: boolean): Promise<void> {
  if (isFirebaseMode()) return colUpdate('contactMessages', id, { isRead })
  await db.contactMessage.update({ where: { id }, data: { isRead } })
}

export async function deleteContactMessage(id: string): Promise<void> {
  if (isFirebaseMode()) return colDelete('contactMessages', id)
  await db.contactMessage.delete({ where: { id } })
}

export async function subscribeNewsletter(email: string): Promise<boolean> {
  if (isFirebaseMode()) {
    const fb = getFirebaseAdmin()
    if (!fb) return false
    const id = email.trim().toLowerCase()
    const existing = await colGet('newsletterSubscribers', id)
    if (existing) return false // déjà inscrit
    await colAdd('newsletterSubscribers', id, { email, emailLower: id, createdAt: nowISO() })
    return true
  }
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } })
  if (existing) return false
  await db.newsletterSubscriber.create({ data: { email } })
  return true
}

export async function listNewsletterSubscribers(): Promise<{ id: string; email: string; createdAt: string }[]> {
  if (isFirebaseMode()) {
    const rows = await colAll('newsletterSubscribers', 500)
    return rows
      .map((r) => ({ id: str(r.id), email: str(r.email), createdAt: str(r.createdAt) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const rows = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map((r) => ({ id: r.id, email: r.email, createdAt: iso(r.createdAt) }))
}

// ---------------------------------------------------------------------------
// EMAIL LOG
// ---------------------------------------------------------------------------

export interface EmailLogRow {
  id: string
  to: string
  subject: string
  template: string
  status: string
  provider: string
  error: string | null
  orderId: string | null
  userId: string | null
  html: string
  createdAt: string
  sentAt: string | null
}

export async function createEmailLog(data: {
  to: string
  subject: string
  template: string
  status: string
  provider: string
  error?: string | null
  orderId?: string | null
  userId?: string | null
  html: string
}): Promise<EmailLogRow> {
  const row: EmailLogRow = {
    id: fbId(),
    to: data.to,
    subject: data.subject,
    template: data.template,
    status: data.status,
    provider: data.provider,
    error: data.error ?? null,
    orderId: data.orderId ?? null,
    userId: data.userId ?? null,
    html: data.html,
    createdAt: nowISO(),
    sentAt: null,
  }
  if (isFirebaseMode()) {
    await colAdd('emailLogs', row.id, row as unknown as FsDoc)
    return row
  }
  const created = await db.emailLog.create({
    data: {
      to: data.to,
      subject: data.subject,
      template: data.template,
      status: data.status,
      provider: data.provider,
      error: data.error ?? null,
      orderId: data.orderId ?? null,
      userId: data.userId ?? null,
      html: data.html,
    },
  })
  return { ...row, id: created.id, createdAt: iso(created.createdAt) }
}

export async function getEmailLog(id: string): Promise<EmailLogRow | null> {
  if (isFirebaseMode()) {
    const d = await colGet('emailLogs', id)
    return d ? ({ ...fsEmailLog(d), id: str(d.id) } as EmailLogRow) : null
  }
  const log = await db.emailLog.findUnique({ where: { id } })
  if (!log) return null
  return {
    id: log.id,
    to: log.to,
    subject: log.subject,
    template: log.template,
    status: log.status,
    provider: log.provider,
    error: log.error,
    orderId: log.orderId,
    userId: log.userId,
    html: log.html,
    createdAt: iso(log.createdAt),
    sentAt: log.sentAt ? iso(log.sentAt) : null,
  }
}

function fsEmailLog(d: FsDoc): Omit<EmailLogRow, 'id'> {
  return {
    to: str(d.to),
    subject: str(d.subject),
    template: str(d.template),
    status: str(d.status, 'pending'),
    provider: str(d.provider, 'outbox'),
    error: (d.error as string) ?? null,
    orderId: (d.orderId as string) ?? null,
    userId: (d.userId as string) ?? null,
    html: str(d.html),
    createdAt: str(d.createdAt),
    sentAt: (d.sentAt as string) ?? null,
  }
}

export async function listEmailLogs(
  take = 100,
): Promise<Omit<EmailLogRow, 'html'>[]> {
  if (isFirebaseMode()) {
    const rows = await colAll('emailLogs', 500)
    return rows
      .map((d) => ({ id: str(d.id), ...fsEmailLog(d) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, take)
      .map(({ html: _html, ...rest }) => rest)
  }
  const logs = await db.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      to: true,
      subject: true,
      template: true,
      status: true,
      provider: true,
      error: true,
      orderId: true,
      userId: true,
      createdAt: true,
      sentAt: true,
    },
  })
  return logs.map((l) => ({ ...l, createdAt: iso(l.createdAt), sentAt: l.sentAt ? iso(l.sentAt) : null }))
}

export async function updateEmailLog(
  id: string,
  data: { status: string; provider?: string; error?: string | null; sentAt?: string | null },
): Promise<void> {
  if (isFirebaseMode()) {
    const patch: FsDoc = { ...data }
    await colUpdate('emailLogs', id, patch)
    return
  }
  await db.emailLog.update({
    where: { id },
    data: {
      status: data.status,
      provider: data.provider,
      error: data.error,
      sentAt: data.sentAt ? new Date(data.sentAt) : null,
    },
  })
}

// ---------------------------------------------------------------------------
// ANALYTIQUE — fidélité, stats, activité, exports
// ---------------------------------------------------------------------------

export async function loyaltyBalance(
  userId: string,
  email: string,
): Promise<{ earned: number; used: number; orders: number }> {
  if (isFirebaseMode()) {
    const rows = (await colAll('orders', 1000)).map(fsToOrder)
    const mine = rows.filter(
      (o) =>
        o.status !== 'annulee' &&
        (o.userId === userId || o.customerEmail.toLowerCase() === email.toLowerCase()),
    )
    const earned = Math.floor(
      mine.reduce((s, o) => s + Math.max(0, o.subtotal - o.discount - o.pointsUsed), 0),
    )
    const used = Math.floor(mine.reduce((s, o) => s + o.pointsUsed, 0))
    return { earned, used, orders: mine.length }
  }
  const rows = await db.$queryRawUnsafe<{ earned: number | null; used: number | null; orders: number }[]>(
    "SELECT SUM(MAX(0, `subtotal` - `discount` - COALESCE(`pointsUsed`, 0))) AS earned, " +
      'SUM(COALESCE(`pointsUsed`, 0)) AS used, COUNT(*) AS orders FROM `Order` ' +
      "WHERE `status` != 'annulee' AND (`userId` = ? OR `customerEmail` = ?)",
    userId,
    email,
  )
  return {
    earned: Math.floor(Number(rows?.[0]?.earned ?? 0)),
    used: Math.floor(Number(rows?.[0]?.used ?? 0)),
    orders: Number(rows?.[0]?.orders ?? 0),
  }
}

export async function getStatsPayload() {
  const [orders, products, reviews, categories, messages, subscribers, pendingQuestions] = await Promise.all([
    listOrders({ take: 1000 }),
    listProducts({ includeInactive: true }),
    listReviews({}),
    listCategories(),
    listContactMessages(),
    listNewsletterSubscribers(),
    isFirebaseMode()
      ? colAll('questions', 500).then((rows) => rows.filter((r) => r.status === 'pending').length)
      : db.productQuestion.count({ where: { status: 'pending' } }),
  ])

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const lowStock = products.filter((p) => p.stock <= 10).length
  const pendingReviews = reviews.filter((r) => r.status === 'pending').length

  const revenueByDay: { date: string; total: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const total = orders
      .filter((o) => {
        const t = new Date(o.createdAt).getTime()
        return t >= d.getTime() && t < next.getTime()
      })
      .reduce((s, o) => s + o.total, 0)
    revenueByDay.push({
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      total: Math.round(total * 100) / 100,
    })
  }

  const statuses = ['confirmee', 'expediee', 'livree', 'annulee']
  const ordersByStatus = statuses.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }))

  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
  for (const o of orders) {
    for (const it of o.items) {
      const key = it.productId || it.name
      if (!productSales[key]) productSales[key] = { name: it.name, quantity: 0, revenue: 0 }
      productSales[key].quantity += it.quantity
      productSales[key].revenue += it.price * it.quantity
    }
  }
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  const categoryDistribution = categories.map((c) => ({
    name: c.name,
    value: products.filter((p) => p.categoryId === c.id).length,
  }))

  const productById = new Map(products.map((p) => [p.id, p]))
  const salesByCategoryMap: Record<string, number> = {}
  for (const o of orders) {
    for (const it of o.items) {
      if (!it.productId) continue
      const product = productById.get(it.productId)
      if (!product) continue
      const catName = product.category?.name || 'Sans catégorie'
      salesByCategoryMap[catName] = (salesByCategoryMap[catName] || 0) + it.quantity
    }
  }
  const salesByCategory = Object.entries(salesByCategoryMap)
    .map(([name, ventes]) => ({ name, ventes }))
    .sort((a, b) => b.ventes - a.ventes)

  return {
    totalRevenue,
    ordersCount: orders.length,
    productsCount: products.length,
    categoriesCount: categories.length,
    pendingReviews,
    lowStock,
    revenueByDay,
    ordersByStatus,
    topProducts,
    categoryDistribution,
    salesByCategory,
    unreadMessages: messages.filter((m) => !m.isRead).length,
    subscribers: subscribers.length,
    pendingQuestions: Number(pendingQuestions),
  }
}

export interface ActivityEvent {
  id: string
  type: 'order' | 'message' | 'review' | 'question'
  title: string
  detail: string
  createdAt: string
  href: string
}

export async function getActivityFeed(): Promise<ActivityEvent[]> {
  const [orders, messages, reviews, questions] = await Promise.all([
    listOrders({ take: 6 }),
    listContactMessages(),
    listReviews({}),
    listQuestions({ status: 'all' }),
  ])
  const products = await listProducts({ includeInactive: true })
  const nameById = new Map(products.map((p) => [p.id, p.name]))

  const events: ActivityEvent[] = [
    ...orders.slice(0, 6).map((o) => ({
      id: `order-${o.id}`,
      type: 'order' as const,
      title: `Nouvelle commande ${o.orderNumber}`,
      detail: `${o.customerName} · ${o.items?.length ?? 0} article(s)`,
      createdAt: o.createdAt,
      href: 'admin-orders',
    })),
    ...messages.slice(0, 4).map((m) => ({
      id: `message-${m.id}`,
      type: 'message' as const,
      title: m.subject || 'Nouveau message',
      detail: `${m.name} · ${m.email}`,
      createdAt: m.createdAt,
      href: 'admin-messages',
    })),
    ...reviews.slice(0, 4).map((r) => ({
      id: `review-${r.id}`,
      type: 'review' as const,
      title: `Avis ${r.rating}/5 sur ${nameById.get(r.productId) || 'un produit'}`,
      detail: `${r.author} · ${r.status === 'pending' ? 'en attente de modération' : r.status === 'approved' ? 'approuvé' : 'rejeté'}`,
      createdAt: r.createdAt,
      href: 'admin-reviews',
    })),
    ...questions.slice(0, 4).map((q) => ({
      id: `question-${q.id}`,
      type: 'question' as const,
      title: `Question sur ${nameById.get(q.productId) || 'un produit'}`,
      detail: `${q.author} · ${q.status === 'pending' ? 'à répondre' : 'répondue'}`,
      createdAt: q.createdAt,
      href: 'admin-reviews',
    })),
  ]
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12)
}

export async function getOrdersForExport(): Promise<OrderRow[]> {
  if (isFirebaseMode()) {
    const rows = (await colAll('orders', 1000)).map(fsToOrder)
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  const rows = await db.order.findMany({ orderBy: { createdAt: 'asc' }, include: { items: true } })
  return rows.map((o) => ({ ...o, createdAt: iso(o.createdAt), updatedAt: iso(o.updatedAt) })) as unknown as OrderRow[]
}
