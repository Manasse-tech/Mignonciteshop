/**
 * Migration SQLite → Firestore (Firebase).
 *
 * Usage :
 *   1. Collez vos 2 variables Firebase dans .env.local :
 *        FIREBASE_API_KEY=AIza...
 *        FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}   (JSON sur UNE ligne)
 *   2. bun run prisma/scripts/migrate-to-firebase.mjs
 *
 * Ce script :
 *   - exporte TOUTES les données du backend local (SQLite/Prisma) ;
 *   - les importe dans Firestore en conservant les IDENTIFIANTS existants
 *     (les commandes restent liées à leurs comptes) ;
 *   - crée les comptes Firebase Auth correspondants (mot de passe à réinitialiser
 *     via « Mot de passe oublié » — les hash locaux ne sont pas transférables).
 *
 * Idempotent : les documents existants (même id) sont mis à jour, pas dupliqués.
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { randomBytes } from 'crypto'

// --- Configuration Firebase -------------------------------------------------
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) return JSON.parse(raw)
  const fileIdx = process.argv.indexOf('--file')
  if (fileIdx > -1 && process.argv[fileIdx + 1]) {
    return JSON.parse(readFileSync(process.argv[fileIdx + 1], 'utf8'))
  }
  console.error('✗ FIREBASE_SERVICE_ACCOUNT manquant (env ou --file service-account.json)')
  process.exit(1)
}

const serviceAccount = loadServiceAccount()
const { initializeApp, credential } = await import('firebase-admin/app')
const firestore = await import('firebase-admin/firestore')
const adminAuth = await import('firebase-admin/auth')

initializeApp({ credential: credential.cert(serviceAccount), projectId: serviceAccount.project_id })
const db = firestore.getFirestore()
const auth = adminAuth.getAuth()

const prisma = new PrismaClient()
const iso = (d) => (d instanceof Date ? d.toISOString() : d ?? null)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function writeAll(collectionName, docs) {
  // Firestore : max 450 opérations par batch
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch()
    for (const { id, data } of docs.slice(i, i + 400)) {
      batch.set(db.collection(collectionName).doc(id), data, { merge: true })
    }
    await batch.commit()
    await sleep(120) // quota d'écritures Spark plan
  }
  console.log(`  ✓ ${collectionName}: ${docs.length} document(s)`)
}

async function main() {
  console.log(`→ Migration vers le projet Firebase « ${serviceAccount.project_id} »\n`)

  // 1. Catégories
  const categories = await prisma.category.findMany()
  await writeAll('categories', categories.map((c) => ({
    id: c.id,
    data: {
      name: c.name, slug: c.slug, description: c.description, image: c.image,
      order: c.order, createdAt: iso(c.createdAt), updatedAt: iso(c.updatedAt),
    },
  })))

  // 2. Produits (+ objet catégorie dénormalisé pour les fiches)
  const products = await prisma.product.findMany({ include: { category: true } })
  const catById = new Map(categories.map((c) => [c.id, c]))
  await writeAll('products', products.map((p) => ({
    id: p.id,
    data: {
      name: p.name, slug: p.slug, description: p.description, details: p.details,
      price: p.price, oldPrice: p.oldPrice, image: p.image, gallery: p.gallery ?? '[]',
      categoryId: p.categoryId,
      category: p.categoryId && catById.get(p.categoryId)
        ? { id: p.categoryId, name: catById.get(p.categoryId).name, slug: catById.get(p.categoryId).slug,
            description: catById.get(p.categoryId).description, image: catById.get(p.categoryId).image,
            order: catById.get(p.categoryId).order,
            createdAt: iso(catById.get(p.categoryId).createdAt), updatedAt: iso(catById.get(p.categoryId).updatedAt) }
        : null,
      stock: p.stock, rating: p.rating, reviewCount: p.reviewCount, soldCount: p.soldCount,
      isFeatured: p.isFeatured, isNew: p.isNew, isActive: p.isActive,
      sizes: p.sizes ?? '[]', colors: p.colors ?? '[]',
      createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt),
    },
  })))

  // 3. Codes promo
  const promos = await prisma.promoCode.findMany()
  await writeAll('promoCodes', promos.map((r) => ({
    id: r.id,
    data: { code: r.code, type: r.type, value: r.value, label: r.label, active: r.active,
      usageCount: r.usageCount, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) },
  })))

  // 4. Utilisateurs — profils Firestore + comptes Firebase Auth
  const users = await prisma.user.findMany()
  await writeAll('users', users.map((u) => ({
    id: u.id,
    data: {
      email: u.email, emailLower: u.email.toLowerCase(), passwordHash: u.passwordHash,
      name: u.name, role: u.role, firebaseUid: u.supabaseUserId ?? null, emailVerified: true,
      createdAt: iso(u.createdAt), updatedAt: iso(u.updatedAt),
    },
  })))
  for (const u of users) {
    try {
      await auth.getUserByEmail(u.email)
      console.log(`  ✓ auth: ${u.email} existe déjà`)
    } catch {
      const tempPassword = randomBytes(12).toString('base64url')
      const created = await auth.createUser({
        email: u.email, password: tempPassword, emailVerified: true,
        displayName: u.name,
      })
      await writeAll('users', [{
        id: u.id,
        data: { firebaseUid: created.uid },
      }])
      console.log(`  ✓ auth: ${u.email} créé (uid ${created.uid}) — réinitialiser le mot de passe via « Mot de passe oublié »`)
    }
  }

  // 5. Commandes (+ lignes intégrées)
  const orders = await prisma.order.findMany({ include: { items: true } })
  await writeAll('orders', orders.map((o) => ({
    id: o.id,
    data: {
      orderNumber: o.orderNumber, userId: o.userId, customerName: o.customerName,
      customerEmail: o.customerEmail, phone: o.phone, address: o.address, city: o.city,
      postalCode: o.postalCode, country: o.country, paymentMethod: o.paymentMethod,
      shippingMethod: o.shippingMethod, subtotal: o.subtotal, shipping: o.shipping,
      discount: o.discount, promoCode: o.promoCode, total: o.total, status: o.status,
      pointsUsed: o.pointsUsed ?? 0, notes: o.notes,
      items: o.items.map((it) => ({
        id: it.id, orderId: it.orderId, productId: it.productId, name: it.name,
        price: it.price, image: it.image, quantity: it.quantity,
      })),
      createdAt: iso(o.createdAt), updatedAt: iso(o.updatedAt),
    },
  })))

  // 6. Avis / questions / messages / newsletter / historique de prix / journal emails
  const reviews = await prisma.review.findMany()
  await writeAll('reviews', reviews.map((r) => ({
    id: r.id,
    data: {
      productId: r.productId, userId: r.userId, author: r.author, email: r.email,
      rating: r.rating, title: r.title, content: r.content, status: r.status,
      helpfulCount: r.helpfulCount ?? 0, photos: r.photos ?? '[]', createdAt: iso(r.createdAt),
    },
  })))

  const questions = await prisma.productQuestion.findMany()
  await writeAll('questions', questions.map((q) => ({
    id: q.id,
    data: {
      productId: q.productId, author: q.author, question: q.question, answer: q.answer,
      status: q.status, helpfulCount: q.helpfulCount ?? 0, answeredAt: iso(q.answeredAt),
      createdAt: iso(q.createdAt), updatedAt: iso(q.updatedAt),
    },
  })))

  const messages = await prisma.contactMessage.findMany()
  await writeAll('contactMessages', messages.map((m) => ({
    id: m.id,
    data: { name: m.name, email: m.email, subject: m.subject, message: m.message,
      isRead: m.isRead, createdAt: iso(m.createdAt) },
  })))

  const subs = await prisma.newsletterSubscriber.findMany()
  await writeAll('newsletterSubscribers', subs.map((s) => ({
    id: s.email.toLowerCase(),
    data: { email: s.email, emailLower: s.email.toLowerCase(), createdAt: iso(s.createdAt) },
  })))

  const history = await prisma.priceHistory.findMany()
  await writeAll('priceHistory', history.map((h) => ({
    id: h.id,
    data: { productId: h.productId, price: h.price, oldPrice: h.oldPrice, createdAt: iso(h.createdAt) },
  })))

  const emails = await prisma.emailLog.findMany()
  await writeAll('emailLogs', emails.map((e) => ({
    id: e.id,
    data: { to: e.to, subject: e.subject, template: e.template, status: e.status,
      provider: e.provider, error: e.error, orderId: e.orderId, userId: e.userId,
      html: e.html ?? '', createdAt: iso(e.createdAt), sentAt: iso(e.sentAt) },
  })))

  console.log('\n✅ Migration terminée. Redémarrez l’app : le backend bascule automatiquement sur Firebase.')
  console.log('   NB : mots de passe des comptes migrés → chacun doit passer par « Mot de passe oublié ».')
}

main()
  .catch((e) => { console.error('✗ Migration échouée:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
