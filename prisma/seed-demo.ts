/**
 * Seed DÉMO — données de test réalistes pour éprouver le backend et
 * l'espace admin en conditions réelles.
 *
 * Crée (de façon idempotente — reset des tables de démo avant insertion) :
 *  - 8 comptes clients (mot de passe commun : Client1234!)
 *  - 17 commandes réparties sur 14 jours : 6 livrées, 3 expédiées,
 *    3 payées, 2 en attente, 2 annulées + 2 commandes « invité »
 *    (tous les montants sont calculés avec les mêmes règles que le serveur)
 *  - 10 avis : 4 approuvés (notes produits recalculées) + 6 en modération
 *  - 3 alertes de réassort, 3 messages de contact, 6 abonnés newsletter
 *  - Codes promo : les 4 officiels (compteurs réalistes) + 5 codes de
 *    démonstration couvrant les cas limites (expiré, limite atteinte,
 *    expire bientôt, désactivé)
 *  - Stocks de démonstration : 3 produits en stock faible, 1 en rupture
 *
 * Exécution : bun run prisma/seed-demo.ts
 * (ne touche ni les catégories, ni les produits existants, ni l'admin)
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Helpers de prix (mêmes règles que src/lib/order-pricing.ts, valeurs courantes)
// ---------------------------------------------------------------------------

const round2 = (v: number) => Math.round(v * 100) / 100

interface PromoDef {
  type: "percent" | "freeship" | "amount"
  value: number
  minSubtotal: number
}

const PROMO_DEFS: Record<string, PromoDef> = {
  BIENVENUE10: { type: "percent", value: 10, minSubtotal: 0 },
  FREESHIP: { type: "freeship", value: 0, minSubtotal: 25 },
  GOLD20: { type: "percent", value: 20, minSubtotal: 100 },
  REDUCTION5: { type: "amount", value: 5, minSubtotal: 30 },
}

function computeShipping(
  method: "standard" | "express" | "pickup",
  subtotal: number,
  freeShippingPromo: boolean
): number {
  if (method === "express") return 9.99
  if (method === "pickup") return 2.99
  if (subtotal >= 50 || freeShippingPromo) return 0
  return 4.99
}

function computeDiscount(code: string | null, subtotal: number): number {
  if (!code) return 0
  const def = PROMO_DEFS[code]
  if (!def || subtotal < def.minSubtotal) return 0
  if (def.type === "percent") return round2((subtotal * def.value) / 100)
  if (def.type === "amount") return Math.min(def.value, subtotal)
  return 0
}

// ---------------------------------------------------------------------------
// Données de démonstration
// ---------------------------------------------------------------------------

const CLIENT_PASSWORD = "Client1234!"

const DEMO_CUSTOMERS = [
  { name: "Marie Dubois", email: "marie@test.fr", daysAgo: 210 },
  { name: "Sophie Martin", email: "sophie.martin@gmail.com", daysAgo: 160 },
  { name: "Julien Bernard", email: "julien.bernard@outlook.fr", daysAgo: 120 },
  { name: "Camille Petit", email: "camille.petit@free.fr", daysAgo: 95 },
  { name: "Thomas Leroy", email: "thomas.leroy@yahoo.fr", daysAgo: 70 },
  { name: "Léa Moreau", email: "lea.moreau@gmail.com", daysAgo: 45 },
  { name: "Nicolas Garcia", email: "nicolas.garcia@orange.fr", daysAgo: 30 },
  { name: "Emma Roux", email: "emma.roux@laposte.net", daysAgo: 12 },
]

interface DemoItem {
  slug: string
  quantity: number
  size?: string
  color?: string
}

interface DemoOrder {
  reference: string
  customerName: string
  email: string
  phone: string | null
  line1: string
  line2?: string
  postalCode: string
  city: string
  shippingMethod: "standard" | "express" | "pickup"
  promoCode: string | null
  paymentMethod: "card" | "paypal" | "transfer"
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
  daysAgo: number
  hour: number
  notes?: string
  items: DemoItem[]
}

const DEMO_ORDERS: DemoOrder[] = [
  {
    reference: "MC-K7QD3F",
    customerName: "Marie Dubois",
    email: "marie@test.fr",
    phone: "06 12 45 78 90",
    line1: "12 rue des Lilas",
    postalCode: "75011",
    city: "Paris",
    shippingMethod: "standard",
    promoCode: "BIENVENUE10",
    paymentMethod: "card",
    status: "delivered",
    daysAgo: 13,
    hour: 10,
    items: [
      { slug: "sneakers-urbaines-classic", quantity: 1, size: "38", color: "Blanc" },
      { slug: "gourde-isotherme-inox", quantity: 1, color: "Noir mat" },
    ],
  },
  {
    reference: "MC-P2W9RT",
    customerName: "Sophie Martin",
    email: "sophie.martin@gmail.com",
    phone: "06 34 56 12 89",
    line1: "8 avenue Victor Hugo",
    line2: "Appartement 14",
    postalCode: "69003",
    city: "Lyon",
    shippingMethod: "express",
    promoCode: null,
    paymentMethod: "card",
    status: "delivered",
    daysAgo: 12,
    hour: 14,
    items: [{ slug: "enceinte-bluetooth-nomade", quantity: 1, color: "Bleu nuit" }],
  },
  {
    reference: "MC-J5N8HX",
    customerName: "Julien Bernard",
    email: "julien.bernard@outlook.fr",
    phone: "07 82 34 56 10",
    line1: "27 boulevard Gambetta",
    postalCode: "33000",
    city: "Bordeaux",
    shippingMethod: "standard",
    promoCode: "GOLD20",
    paymentMethod: "card",
    status: "delivered",
    daysAgo: 11,
    hour: 9,
    items: [{ slug: "montre-connectee-sport", quantity: 1, color: "Noir" }],
  },
  {
    reference: "MC-V3B6YL",
    customerName: "Camille Petit",
    email: "camille.petit@free.fr",
    phone: null,
    line1: "3 impasse des Peupliers",
    postalCode: "44000",
    city: "Nantes",
    shippingMethod: "standard",
    promoCode: "FREESHIP",
    paymentMethod: "card",
    status: "delivered",
    daysAgo: 10,
    hour: 18,
    items: [
      { slug: "tapis-de-yoga-pro", quantity: 1, color: "Violet" },
      { slug: "bougie-parfumee-artisanale", quantity: 1, color: "Vanille" },
    ],
  },
  {
    reference: "MC-D8T4ZK",
    customerName: "Thomas Leroy",
    email: "thomas.leroy@yahoo.fr",
    phone: "06 99 88 77 66",
    line1: "45 rue de la République",
    postalCode: "69002",
    city: "Lyon",
    shippingMethod: "pickup",
    promoCode: "REDUCTION5",
    paymentMethod: "card",
    status: "delivered",
    daysAgo: 9,
    hour: 11,
    items: [{ slug: "sac-a-dos-urbain", quantity: 1, color: "Gris" }],
  },
  {
    reference: "MC-R6M2QC",
    customerName: "Léa Moreau",
    email: "lea.moreau@gmail.com",
    phone: "06 45 23 78 91",
    line1: "16 rue Nationale",
    postalCode: "59000",
    city: "Lille",
    shippingMethod: "express",
    promoCode: null,
    paymentMethod: "card",
    status: "shipped",
    daysAgo: 7,
    hour: 15,
    items: [{ slug: "ecouteurs-bluetooth-pro", quantity: 1, color: "Blanc" }],
  },
  {
    reference: "MC-H9X5WN",
    customerName: "Nicolas Garcia",
    email: "nicolas.garcia@orange.fr",
    phone: "07 56 34 12 98",
    line1: "5 place du Marché",
    postalCode: "31000",
    city: "Toulouse",
    shippingMethod: "standard",
    promoCode: "BIENVENUE10",
    paymentMethod: "card",
    status: "shipped",
    daysAgo: 6,
    hour: 13,
    items: [
      { slug: "service-a-the-ceramique", quantity: 1 },
      { slug: "coussin-decoratif", quantity: 1, color: "Terracotta" },
    ],
  },
  {
    reference: "MC-B4G7JP",
    customerName: "Emma Roux",
    email: "emma.roux@laposte.net",
    phone: null,
    line1: "22 chemin des Vignes",
    postalCode: "67000",
    city: "Strasbourg",
    shippingMethod: "standard",
    promoCode: null,
    paymentMethod: "card",
    status: "shipped",
    daysAgo: 5,
    hour: 16,
    items: [
      { slug: "lunettes-soleil-retro", quantity: 1, color: "Or" },
      { slug: "gourde-isotherme-inox", quantity: 1, color: "Argent" },
    ],
  },
  {
    reference: "MC-L2F8VD",
    customerName: "Claire Fontaine",
    email: "claire.fontaine@gmail.com",
    phone: "06 78 90 12 34",
    line1: "9 rue du Commerce",
    postalCode: "75015",
    city: "Paris",
    shippingMethod: "express",
    promoCode: null,
    paymentMethod: "card",
    status: "delivered",
    daysAgo: 6,
    hour: 20,
    notes: "Livrer après 18 h si possible.",
    items: [{ slug: "lampe-led-design", quantity: 1, color: "Blanc" }],
  },
  {
    reference: "MC-Z7C3KT",
    customerName: "Marie Dubois",
    email: "marie@test.fr",
    phone: "06 12 45 78 90",
    line1: "12 rue des Lilas",
    postalCode: "75011",
    city: "Paris",
    shippingMethod: "standard",
    promoCode: null,
    paymentMethod: "paypal",
    status: "paid",
    daysAgo: 4,
    hour: 12,
    items: [
      { slug: "sneakers-urbaines-classic", quantity: 1, size: "38", color: "Noir" },
    ],
  },
  {
    reference: "MC-Q5Y9NB",
    customerName: "Sophie Martin",
    email: "sophie.martin@gmail.com",
    phone: "06 34 56 12 89",
    line1: "8 avenue Victor Hugo",
    line2: "Appartement 14",
    postalCode: "69003",
    city: "Lyon",
    shippingMethod: "standard",
    promoCode: "GOLD20",
    paymentMethod: "card",
    status: "paid",
    daysAgo: 3,
    hour: 21,
    items: [{ slug: "halteres-ajustables", quantity: 1 }],
  },
  {
    reference: "MC-W8P4RM",
    customerName: "Julien Bernard",
    email: "julien.bernard@outlook.fr",
    phone: "07 82 34 56 10",
    line1: "27 boulevard Gambetta",
    postalCode: "33000",
    city: "Bordeaux",
    shippingMethod: "express",
    promoCode: null,
    paymentMethod: "card",
    status: "paid",
    daysAgo: 2,
    hour: 8,
    items: [
      { slug: "bougie-parfumee-artisanale", quantity: 3, color: "Santal" },
    ],
  },
  {
    reference: "MC-N3J6XF",
    customerName: "Camille Petit",
    email: "camille.petit@free.fr",
    phone: null,
    line1: "3 impasse des Peupliers",
    postalCode: "44000",
    city: "Nantes",
    shippingMethod: "standard",
    promoCode: null,
    paymentMethod: "transfer",
    status: "pending",
    daysAgo: 1,
    hour: 17,
    items: [
      { slug: "lampe-led-design", quantity: 1, color: "Noir" },
      { slug: "coussin-decoratif", quantity: 1, color: "Vert sauge" },
    ],
  },
  {
    reference: "MC-S9D2GH",
    customerName: "Thomas Leroy",
    email: "thomas.leroy@yahoo.fr",
    phone: "06 99 88 77 66",
    line1: "45 rue de la République",
    postalCode: "69002",
    city: "Lyon",
    shippingMethod: "pickup",
    promoCode: "BIENVENUE10",
    paymentMethod: "card",
    status: "pending",
    daysAgo: 0,
    hour: 8,
    items: [{ slug: "gourde-isotherme-inox", quantity: 1, color: "Noir mat" }],
  },
  {
    reference: "MC-A6K5TZ",
    customerName: "Nicolas Garcia",
    email: "nicolas.garcia@orange.fr",
    phone: "07 56 34 12 98",
    line1: "5 place du Marché",
    postalCode: "31000",
    city: "Toulouse",
    shippingMethod: "standard",
    promoCode: null,
    paymentMethod: "card",
    status: "cancelled",
    daysAgo: 8,
    hour: 19,
    items: [{ slug: "ecouteurs-bluetooth-pro", quantity: 1, color: "Noir" }],
  },
  {
    reference: "MC-E4U7CB",
    customerName: "Pauline Renard",
    email: "pauline.r@orange.fr",
    phone: null,
    line1: "31 rue Jean Jaurès",
    postalCode: "80000",
    city: "Amiens",
    shippingMethod: "standard",
    promoCode: null,
    paymentMethod: "card",
    status: "cancelled",
    daysAgo: 2,
    hour: 22,
    items: [{ slug: "tapis-de-yoga-pro", quantity: 1, color: "Bleu" }],
  },
]

const APPROVED_REVIEWS = [
  {
    slug: "sneakers-urbaines-classic",
    author: "Paul Verlaine",
    rating: 5,
    title: "Confort exceptionnel",
    comment:
      "Livrées en 48 h, la taille correspond parfaitement au guide. On peut les porter toute la journée sans aucune gêne, je recommande sans hésiter.",
    daysAgo: 9,
  },
  {
    slug: "enceinte-bluetooth-nomade",
    author: "Sophie Martin",
    rating: 4,
    title: "Très bon son",
    comment:
      "Son équilibré et basses présentes pour ce prix. L'autonomie tient facilement les 20 heures annoncées à volume moyen.",
    daysAgo: 7,
  },
  {
    slug: "gourde-isotherme-inox",
    author: "Julien Bernard",
    rating: 5,
    title: "Parfaite pour le sport",
    comment:
      "L'eau reste vraiment froide toute la journée même en plein soleil. Le bouchon ne fuit pas dans le sac, rien à redire.",
    daysAgo: 5,
  },
  {
    slug: "bougie-parfumee-artisanale",
    author: "Camille Petit",
    rating: 5,
    title: "Odeur divine",
    comment:
      "La vanille est douce et présente sans être écœurante. La mèche en bois crépite vraiment, un vrai moment cocooning.",
    daysAgo: 4,
  },
]

const PENDING_REVIEWS = [
  {
    slug: "montre-connectee-sport",
    author: "Thomas Leroy",
    rating: 4,
    title: "Très bonne montre",
    comment:
      "Autonomie impressionnante, GPS précis en course. L'application mobile mériterait quelques améliorations mais globalement très satisfait.",
    daysAgo: 2,
  },
  {
    slug: "lampe-led-design",
    author: "Léa Moreau",
    rating: 3,
    title: "Correcte mais lumineuse juste ce qu'il faut",
    comment:
      "Le design est superbe et la finition mate est réussie. En revanche la puissance maximale reste un peu faible pour lire le soir.",
    daysAgo: 3,
  },
  {
    slug: "ecouteurs-bluetooth-pro",
    author: "Nicolas Garcia",
    rating: 5,
    title: "Réduction de bruit efficace",
    comment:
      "Dans le métro, la réduction de bruit active fait des miracles. L'appairage est instantané avec le téléphone comme avec le PC.",
    daysAgo: 1,
  },
  {
    slug: "sac-a-dos-urbain",
    author: "Emma Roux",
    rating: 2,
    title: "Déçu par la couture",
    comment:
      "La couture de la poche latérale a cédé après trois semaines d'usage normal. Le SAV m'a proposé un échange, à suivre.",
    daysAgo: 1,
  },
  {
    slug: "tapis-de-yoga-pro",
    author: "Marie Dubois",
    rating: 5,
    title: "Adhérence parfaite",
    comment:
      "Aucun glissement même en transpiration sur les postes de torsion. Les repères d'alignement sont très utiles pour progresser.",
    daysAgo: 0,
  },
  {
    slug: "coussin-decoratif",
    author: "Claire Fontaine",
    rating: 4,
    title: "Très doux",
    comment:
      "Le tissu bouclé est agréable et la couleur terracotta est fidèle aux photos. Housse lavée à 30° sans souci.",
    daysAgo: 0,
  },
]

const CONTACT_MESSAGES = [
  {
    name: "Paul Verlaine",
    email: "paul.v@gmail.com",
    subject: "Délai de livraison en Corse ?",
    message:
      "Bonjour, je souhaite commander la montre connectée. Quel est le délai de livraison pour la Corse avec l'option standard ? Merci d'avance.",
    daysAgo: 2,
  },
  {
    name: "Inès Krief",
    email: "ines.krief@outlook.fr",
    subject: "Demande de retour — sneakers taille 41",
    message:
      "Bonjour, les sneakers reçues hier sont trop petites. Je voudrais procéder à un échange pour une taille 42. Comment dois-je renvoyer la paire ?",
    daysAgo: 1,
  },
  {
    name: "Atelier Lumière",
    email: "contact@atelier-lumiere.fr",
    subject: "Partenariat boutique physique",
    message:
      "Bonjour, nous tenons une boutique de décoration à Annecy et serions intéressés par un partenariat de revente de vos bougies artisanales. Pouvons-nous convenir d'un échange ?",
    daysAgo: 0,
  },
]

const NEWSLETTER_EMAILS = [
  "paul.v@gmail.com",
  "ines.krief@outlook.fr",
  "sandra.k@gmail.com",
  "marc.dupuis@free.fr",
  "yasmine.b@gmail.com",
  "claire.fontaine@gmail.com",
]

const EXTRA_PROMOS = [
  {
    code: "ETE25",
    label: "-25 % dès 40 € d'achat",
    type: "percent",
    value: 25,
    minSubtotal: 40,
    maxUses: 200,
    usageCount: 2,
    isActive: true,
    expiresAt: null as Date | null,
  },
  {
    code: "RENTREE15",
    label: "-15 % rentrée, sans minimum",
    type: "percent",
    value: 15,
    minSubtotal: 0,
    maxUses: 100,
    usageCount: 97,
    isActive: true,
    expiresAt: null,
  },
  {
    code: "FLASH50",
    label: "-50 € dès 200 € — offre flash 72 h",
    type: "amount",
    value: 50,
    minSubtotal: 200,
    maxUses: null,
    usageCount: 0,
    isActive: true,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    code: "VIP10",
    label: "-10 % membres VIP (désactivé)",
    type: "percent",
    value: 10,
    minSubtotal: 0,
    maxUses: null,
    usageCount: 23,
    isActive: false,
    expiresAt: null,
  },
  {
    code: "BLACKFRIDAY30",
    label: "-30 % dès 80 € (Black Friday passé)",
    type: "percent",
    value: 30,
    minSubtotal: 80,
    maxUses: null,
    usageCount: 41,
    isActive: true,
    expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
]

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

function daysAgoDate(daysAgo: number, hour: number): Date {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
  return date
}

async function main() {
  console.log("🧪 Seed DÉMO MignonciteShop — démarrage…")

  // 0. Reset des tables de démonstration (le catalogue et l'admin sont conservés).
  await prisma.order.deleteMany()
  await prisma.review.deleteMany()
  await prisma.stockAlert.deleteMany()
  await prisma.contactMessage.deleteMany()
  await prisma.newsletterSubscriber.deleteMany()
  await prisma.promoCode.deleteMany()
  await prisma.analyticsEvent.deleteMany()
  await prisma.emailLog.deleteMany()
  await prisma.auditLog.deleteMany()
  console.log("🗑  Tables de démo vidées (commandes, avis, alertes, messages, promos, analytics, e-mails, audit)")

  // 1. Comptes clients (upsert — marie@test.fr peut déjà exister).
  const passwordHash = await bcrypt.hash(CLIENT_PASSWORD, 10)
  for (const customer of DEMO_CUSTOMERS) {
    await prisma.user.upsert({
      where: { email: customer.email },
      update: { name: customer.name, password: passwordHash, role: "customer" },
      create: {
        name: customer.name,
        email: customer.email,
        password: passwordHash,
        role: "customer",
        createdAt: daysAgoDate(customer.daysAgo, 12),
      },
    })
  }
  console.log(`✅ ${DEMO_CUSTOMERS.length} comptes clients (mot de passe : ${CLIENT_PASSWORD})`)

  // 2. Catalogue chargé par slug (les IDs réels sont en base).
  const products = await prisma.product.findMany()
  const productBySlug = new Map(products.map((p) => [p.slug, p]))
  if (products.length === 0) {
    throw new Error("Aucun produit en base — lancez d'abord : bun run prisma/seed.ts")
  }

  // 3. Commandes (montants calculés avec les mêmes règles que le serveur).
  let created = 0
  for (const demo of DEMO_ORDERS) {
    const lines = demo.items.map((item) => {
      const product = productBySlug.get(item.slug)
      if (!product) throw new Error(`Produit inconnu dans le seed démo : ${item.slug}`)
      return { product, quantity: item.quantity, size: item.size ?? null, color: item.color ?? null }
    })

    const subtotal = round2(
      lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
    )
    const discount = computeDiscount(demo.promoCode, subtotal)
    const freeShipping = PROMO_DEFS[demo.promoCode ?? ""]?.type === "freeship" && discount >= 0
    const shippingCost = computeShipping(demo.shippingMethod, subtotal, freeShipping)
    const total = round2(subtotal - discount + shippingCost)

    const paidLike = ["paid", "shipped", "delivered"].includes(demo.status)
    const paymentStatus = paidLike
      ? "paid"
      : demo.status === "pending"
        ? "unpaid"
        : "refunded"

    await prisma.order.create({
      data: {
        reference: demo.reference,
        status: demo.status,
        email: demo.email,
        customerName: demo.customerName,
        phone: demo.phone,
        addressLine1: demo.line1,
        addressLine2: demo.line2 ?? null,
        postalCode: demo.postalCode,
        city: demo.city,
        country: "France",
        shippingMethod: demo.shippingMethod,
        shippingCost,
        subtotal,
        discount,
        total,
        promoCode: demo.promoCode,
        paymentMethod: demo.paymentMethod,
        paymentStatus,
        notes: demo.notes ?? null,
        createdAt: daysAgoDate(demo.daysAgo, demo.hour),
        updatedAt: daysAgoDate(demo.daysAgo, demo.hour),
        items: {
          create: lines.map((line) => ({
            productId: line.product.id,
            productName: line.product.name,
            image: line.product.image,
            unitPrice: line.product.price,
            quantity: line.quantity,
            size: line.size,
            color: line.color,
          })),
        },
      },
    })
    created += 1
  }
  console.log(`✅ ${created} commandes créées (5 statuts, 2 clients invités)`)

  // 4. Stocks et compteurs de ventes (hors commandes annulées).
  for (const demo of DEMO_ORDERS) {
    if (demo.status === "cancelled") continue
    for (const item of demo.items) {
      const product = productBySlug.get(item.slug)!
      await prisma.product.update({
        where: { id: product.id },
        data: {
          stock: Math.max(0, product.stock - item.quantity),
          soldCount: { increment: item.quantity },
        },
      })
    }
  }
  console.log("✅ Stocks décrémentés et compteurs de ventes mis à jour")

  // 5. Stocks de démonstration (stock faible / rupture pour l'admin).
  const lowStockTargets: [string, number][] = [
    ["montre-connectee-sport", 4],
    ["service-a-the-ceramique", 3],
    ["halteres-ajustables", 5],
    ["veste-legere-premium", 0],
  ]
  for (const [slug, stock] of lowStockTargets) {
    const product = productBySlug.get(slug)
    if (product) {
      await prisma.product.update({ where: { id: product.id }, data: { stock } })
    }
  }
  console.log("✅ Stocks de démonstration : 3 en stock faible, 1 en rupture")

  // 6. Avis (approuvés + en modération) puis recalcul des notes produits.
  const reviewRows: {
    productId: string
    author: string
    rating: number
    title: string | null
    comment: string
    isApproved: boolean
    createdAt: Date
  }[] = []
  for (const review of APPROVED_REVIEWS) {
    const product = productBySlug.get(review.slug)!
    reviewRows.push({
      productId: product.id,
      author: review.author,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isApproved: true,
      createdAt: daysAgoDate(review.daysAgo, 10),
    })
  }
  for (const review of PENDING_REVIEWS) {
    const product = productBySlug.get(review.slug)!
    reviewRows.push({
      productId: product.id,
      author: review.author,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isApproved: false,
      createdAt: daysAgoDate(review.daysAgo, 15),
    })
  }
  await prisma.review.createMany({ data: reviewRows })

  // Recalcul identique à src/lib/review-utils.ts (avis approuvés uniquement).
  const approvedByProduct = new Map<string, number[]>()
  for (const row of reviewRows) {
    if (!row.isApproved) continue
    const list = approvedByProduct.get(row.productId) ?? []
    list.push(row.rating)
    approvedByProduct.set(row.productId, list)
  }
  for (const [productId, ratings] of approvedByProduct) {
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: Math.round(avg * 10) / 10,
        reviewCount: ratings.length,
      },
    })
  }
  console.log(
    `✅ ${reviewRows.length} avis (${APPROVED_REVIEWS.length} approuvés, ${PENDING_REVIEWS.length} en modération)`
  )

  // 7. Alertes de réassort (produits en rupture / stock faible).
  const stockAlertRows: { email: string; slug: string }[] = [
    { email: "lea.moreau@gmail.com", slug: "veste-legere-premium" },
    { email: "thomas.leroy@yahoo.fr", slug: "montre-connectee-sport" },
    { email: "emma.roux@laposte.net", slug: "service-a-the-ceramique" },
  ]
  for (const alert of stockAlertRows) {
    const product = productBySlug.get(alert.slug)!
    await prisma.stockAlert.create({
      data: { email: alert.email, productId: product.id, notified: false },
    })
  }
  console.log(`✅ ${stockAlertRows.length} alertes de réassort`)

  // 8. Messages de contact + newsletter.
  await prisma.contactMessage.createMany({
    data: CONTACT_MESSAGES.map((message) => ({
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.message,
      createdAt: daysAgoDate(message.daysAgo, 11),
    })),
  })
  await prisma.newsletterSubscriber.createMany({
    data: NEWSLETTER_EMAILS.map((email, index) => ({
      email,
      createdAt: daysAgoDate(index + 1, 9),
    })),
  })
  console.log(`✅ ${CONTACT_MESSAGES.length} messages de contact, ${NEWSLETTER_EMAILS.length} abonnés newsletter`)

  // 9. Codes promo : 4 officiels + 5 codes de démonstration (cas limites).
  const officialPromos = [
    { code: "BIENVENUE10", label: "-10 % sur votre commande", type: "percent", value: 10, minSubtotal: 0, maxUses: null, usageCount: 12, isActive: true, expiresAt: null },
    { code: "FREESHIP", label: "Livraison offerte", type: "freeship", value: 0, minSubtotal: 25, maxUses: null, usageCount: 5, isActive: true, expiresAt: null },
    { code: "GOLD20", label: "-20 % dès 100 € d'achat", type: "percent", value: 20, minSubtotal: 100, maxUses: null, usageCount: 3, isActive: true, expiresAt: null },
    { code: "REDUCTION5", label: "-5 € sur votre commande", type: "amount", value: 5, minSubtotal: 30, maxUses: null, usageCount: 4, isActive: true, expiresAt: null },
  ]
  await prisma.promoCode.createMany({
    data: [...officialPromos, ...EXTRA_PROMOS],
  })
  console.log(`✅ ${officialPromos.length + EXTRA_PROMOS.length} codes promo (officiels + démonstration)`)

  // 10. Événements analytics de démonstration (activité des rapports).
  const EVENTS: { event: string; page?: string; productId?: string; value?: number; daysAgo: number }[] = [
    { event: "page_view", page: "home", daysAgo: 0 }, { event: "page_view", page: "shop", daysAgo: 0 },
    { event: "product_view", page: "product", daysAgo: 0 }, { event: "add_to_cart", daysAgo: 0 },
    { event: "page_view", page: "home", daysAgo: 1 }, { event: "page_view", page: "shop", daysAgo: 1 },
    { event: "product_view", page: "product", daysAgo: 1 }, { event: "search", daysAgo: 1 },
    { event: "begin_checkout", page: "checkout", daysAgo: 1 },
    { event: "page_view", page: "home", daysAgo: 2 }, { event: "add_to_cart", daysAgo: 2 },
    { event: "wishlist_add", daysAgo: 2 }, { event: "apply_promo", daysAgo: 2 },
    { event: "page_view", page: "product", daysAgo: 3 }, { event: "product_view", page: "product", daysAgo: 3 },
    { event: "newsletter_signup", daysAgo: 4 }, { event: "review_submitted", daysAgo: 5 },
    { event: "stock_alert", daysAgo: 6 }, { event: "contact_submit", daysAgo: 7 },
    { event: "page_view", page: "home", daysAgo: 9 }, { event: "add_to_cart", daysAgo: 10 },
    { event: "page_view", page: "shop", daysAgo: 12 }, { event: "product_view", page: "product", daysAgo: 13 },
  ]
  await prisma.analyticsEvent.createMany({
    data: EVENTS.map((e) => ({
      event: e.event,
      page: e.page ?? null,
      productId: e.productId ?? null,
      value: e.value ?? null,
      meta: "{}",
      createdAt: daysAgoDate(e.daysAgo, 10),
    })),
  })
  console.log(`✅ ${EVENTS.length} événements analytics`)

  // 11. Journal d'e-mails de démonstration (l'onglet E-mails n'est pas vide).
  await prisma.emailLog.createMany({
    data: [
      {
        to: "marie@test.fr",
        subject: "Confirmation de commande MC-DEMO01 — MignonciteShop",
        template: "order_confirmation",
        body: "Bonjour Marie,\n\nMerci pour votre commande !\n  Référence : MC-DEMO01\n  TOTAL : 62,98 €\n",
        data: '{"reference":"MC-DEMO01","total":62.98}',
        status: "logged",
        createdAt: daysAgoDate(2, 10),
      },
      {
        to: "marie@test.fr",
        subject: "Commande MC-DEMO01 — statut mis à jour : Expédiée — en cours de livraison",
        template: "order_status",
        body: "Bonjour Marie,\n\nLe statut de votre commande MC-DEMO01 vient d'être mis à jour :\n  Expédiée — en cours de livraison\n",
        data: '{"reference":"MC-DEMO01","status":"shipped"}',
        status: "logged",
        createdAt: daysAgoDate(1, 10),
      },
      {
        to: "sophie@test.fr",
        subject: "De retour en stock : Lampe LED Design — MignonciteShop",
        template: "restock_alert",
        body: "Bonne nouvelle !\n\n« Lampe LED Design » est de nouveau disponible dans notre boutique.\n",
        data: '{"productName":"Lampe LED Design"}',
        status: "logged",
        createdAt: daysAgoDate(0, 10),
      },
      {
        to: "julie@test.fr",
        subject: "Bienvenue chez MignonciteShop, Julie !",
        template: "welcome",
        body: "Bonjour Julie,\n\nVotre compte vient d'être créé.\nÀ très vite dans la boutique !\n",
        data: '{"name":"Julie"}',
        status: "logged",
        createdAt: daysAgoDate(3, 10),
      },
    ],
  })
  console.log(`✅ 4 e-mails de démonstration journalisés`)

  // 12. Journal d'audit de démonstration.
  await prisma.auditLog.createMany({
    data: [
      {
        actor: "admin@mignonciteshop.fr",
        action: "order.status",
        target: "MC-DEMO01",
        details: '{"from":"paid","to":"shipped"}',
        createdAt: daysAgoDate(1, 10),
      },
      {
        actor: "admin@mignonciteshop.fr",
        action: "product.restock",
        target: "Lampe LED Design",
        details: '{"stock":99,"notifications":1}',
        createdAt: daysAgoDate(0, 10),
      },
      {
        actor: "admin@mignonciteshop.fr",
        action: "settings.update",
        target: "",
        details: '{"lowStockThreshold":5}',
        createdAt: daysAgoDate(4, 10),
      },
    ],
  })
  console.log(`✅ 3 entrées d'audit de démonstration`)

  // 13. Vérification finale.
  const [ordersCount, reviewsCount, pendingReviews, customersCount, promosCount] =
    await Promise.all([
      prisma.order.count(),
      prisma.review.count(),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.promoCode.count(),
    ])
  console.log(
    `📊 Vérification : ${ordersCount} commandes, ${reviewsCount} avis (${pendingReviews} en attente), ${customersCount} clients, ${promosCount} codes promo`
  )
  console.log("🧪 Seed DÉMO terminé avec succès.")
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le seed démo :", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
