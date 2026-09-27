/**
 * Seed — Clone MignonciteShop
 * Insère les 4 catégories et les 14 produits avec EXACTEMENT les mêmes
 * données que le site original (cf. /tmp/api_products.json, /tmp/api_categories.json).
 * + Codes promo (moteur serveur /api/promos/validate)
 * + Compte administrateur (rôle "admin", accès /?page=admin)
 *
 * Idempotent : deleteMany puis recréation pour le catalogue ; upsert pour
 * promos et admin.
 * IDs et createdAt/updatedAt originaux conservés → tri createdAt DESC identique
 * au site original (Veste Légère Premium en premier, Gourde Isotherme en dernier).
 *
 * Exécution : bun run prisma/seed.ts  (bun lit le .env automatiquement)
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Codes promo (identiques aux définitions front src/lib/promos.ts)
// ---------------------------------------------------------------------------

const PROMOS = [
  { code: "BIENVENUE10", label: "-10 % sur votre commande", type: "percent", value: 10, minSubtotal: 0 },
  { code: "FREESHIP", label: "Livraison offerte", type: "freeship", value: 0, minSubtotal: 25 },
  { code: "GOLD20", label: "-20 % dès 100 € d'achat", type: "percent", value: 20, minSubtotal: 100 },
  { code: "REDUCTION5", label: "-5 € sur votre commande", type: "amount", value: 5, minSubtotal: 30 },
]

// ---------------------------------------------------------------------------
// Administrateur (démonstration — changer le mot de passe en production)
// ---------------------------------------------------------------------------

const ADMIN = {
  email: "admin@mignonciteshop.fr",
  password: process.env.ADMIN_PASSWORD ?? "Admin1234!",
  name: "Administrateur",
}

// ---------------------------------------------------------------------------
// Catégories (ordre : order asc)
// ---------------------------------------------------------------------------

const categories = [
  {
    id: "cmu0ebze10000ox4r8ci7w4zl",
    name: "Mode",
    slug: "mode",
    description: "Vêtements et accessoires de mode tendance",
    image: "/images/products/photo-1445205170230-053b83016050.jpg",
    order: 1,
    createdAt: new Date("2026-09-13T22:39:13.898Z"),
    updatedAt: new Date("2026-09-13T22:39:13.898Z"),
  },
  {
    id: "cmu0ebze40003ox4rmv19o1of",
    name: "Sport & Loisirs",
    slug: "sport-loisirs",
    description: "Équipement sportif et loisirs",
    image: "/images/products/photo-1571902943202-507ec2618e8f.jpg",
    order: 2,
    createdAt: new Date("2026-09-13T22:39:13.901Z"),
    updatedAt: new Date("2026-09-14T18:45:54.017Z"),
  },
  {
    id: "cmu0ebze30002ox4rtnuz0gez",
    name: "Maison & Déco",
    slug: "maison-deco",
    description: "Tout pour embellir votre intérieur",
    image: "/images/products/photo-1616486338812-3dadae4b4ace.jpg",
    order: 3,
    createdAt: new Date("2026-09-13T22:39:13.900Z"),
    updatedAt: new Date("2026-09-13T22:39:13.900Z"),
  },
  {
    id: "cmu0ebze30001ox4rsm93ckwn",
    name: "Électronique",
    slug: "electronique",
    description: "High-tech et gadgets connectés",
    image: "/images/products/photo-1498049794561-7780e7231661.jpg",
    order: 4,
    createdAt: new Date("2026-09-13T22:39:13.899Z"),
    updatedAt: new Date("2026-09-14T18:45:54.016Z"),
  },
]

// ---------------------------------------------------------------------------
// Produits (triés createdAt DESC comme la réponse GET /api/products originale)
// ---------------------------------------------------------------------------

const products = [
  {
    id: "cmu0ebze50005ox4r7cnaxkhq",
    name: "Veste Légère Premium",
    slug: "veste-legere-premium",
    description:
      "Une veste légère et élégante, confectionnée dans un tissu technique déperlant. Coupe ajustée, finitions soignées et confort optimal pour la mi-saison. Parfaite pour un look urbain chic en toutes circonstances.",
    details:
      "Tissu déperlant · Doublure respirante · Fermeture éclair YKK · Poches zippées",
    price: 79.99,
    oldPrice: 99.99,
    image: "/images/products/photo-1591047139829-d91aecb6caea.jpg",
    gallery:
      '["/images/products/photo-1591047139829-d91aecb6caea.jpg","/images/products/photo-1445205170230-053b83016050.jpg"]',
    categoryId: "cmu0ebze10000ox4r8ci7w4zl",
    stock: 0,
    rating: 4.5,
    reviewCount: 87,
    soldCount: 351,
    isFeatured: true,
    isNew: true,
    isActive: true,
    sizes: '["S","M","L","XL"]',
    colors: '["Noir","Beige","Bleu marine"]',
    createdAt: new Date("2026-09-13T22:39:13.901Z"),
    updatedAt: new Date("2026-09-14T22:17:27.551Z"),
  },
  {
    id: "cmu0ebze70007ox4rigfxsqga",
    name: "Lampe LED Design",
    slug: "lampe-led-design",
    description:
      "Lampe LED au design épuré et moderne. Éclairage d'ambiance tamisé, intensité réglable et finition mate premium. Un objet décoratif qui sublime votre intérieur tout en consommant très peu d'énergie.",
    details: "LED 8W · Intensité réglable · USB-C · Finition mate",
    price: 34.99,
    oldPrice: null,
    image: "/images/products/photo-1507473885765-e6ed057f782c.jpg",
    gallery:
      '["/images/products/photo-1507473885765-e6ed057f782c.jpg","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
    categoryId: "cmu0ebze30002ox4rtnuz0gez",
    stock: 99,
    rating: 4,
    reviewCount: 86,
    soldCount: 129,
    isFeatured: false,
    isNew: false,
    isActive: true,
    sizes: "[]",
    colors: '["Blanc","Noir"]',
    createdAt: new Date("2026-09-13T21:39:13.901Z"),
    updatedAt: new Date("2026-09-15T00:14:20.069Z"),
  },
  {
    id: "cmu0ebze80009ox4r7st1fy0r",
    name: "Tapis de Yoga Pro",
    slug: "tapis-de-yoga-pro",
    description:
      "Tapis de yoga professionnel antidérapant, épais et confortable. Surface texturée pour une adhérence maximale même en transpiration, marques d'alignement discrètes et sangle de transport offerte.",
    details:
      "Épaisseur 6mm · Antidérapant TPE · Sans odeur · Sangle incluse",
    price: 29.99,
    oldPrice: 39.99,
    image: "/images/products/photo-1601925260368-ae2f83cf8b7f.jpg",
    gallery:
      '["/images/products/photo-1601925260368-ae2f83cf8b7f.jpg","/images/products/photo-1571902943202-507ec2618e8f.jpg"]',
    categoryId: "cmu0ebze40003ox4rmv19o1of",
    stock: 60,
    rating: 4,
    reviewCount: 86,
    soldCount: 215,
    isFeatured: true,
    isNew: false,
    isActive: true,
    sizes: "[]",
    colors: '["Violet","Bleu","Noir"]',
    createdAt: new Date("2026-09-13T20:39:13.901Z"),
    updatedAt: new Date("2026-09-14T09:08:58.753Z"),
  },
  {
    id: "cmu0ebze9000box4roqttkihe",
    name: "Écouteurs Bluetooth Pro",
    slug: "ecouteurs-bluetooth-pro",
    description:
      "Écouteurs sans fil à réduction de bruit active. Son haute fidélité, autonomie exceptionnelle de 30h avec le boîtier, appairage instantané et résistance à l'eau IPX5 pour accompagner toutes vos activités.",
    details:
      "ANC actif · 30h autonomie · Bluetooth 5.3 · IPX5 · Boîtier de charge",
    price: 89.99,
    oldPrice: 129.99,
    image: "/images/products/photo-1505740420928-5e560c06d30e.jpg",
    gallery:
      '["/images/products/photo-1505740420928-5e560c06d30e.jpg","/images/products/photo-1498049794561-7780e7231661.jpg"]',
    categoryId: "cmu0ebze30001ox4rsm93ckwn",
    stock: 50,
    rating: 4,
    reviewCount: 86,
    soldCount: 487,
    isFeatured: true,
    isNew: true,
    isActive: true,
    sizes: "[]",
    colors: '["Noir","Blanc"]',
    createdAt: new Date("2026-09-13T19:39:13.901Z"),
    updatedAt: new Date("2026-09-14T09:08:58.755Z"),
  },
  {
    id: "cmu0ebzea000dox4r6tug8sbp",
    name: "Montre Connectée Sport",
    slug: "montre-connectee-sport",
    description:
      "Montre connectée multi-sport avec écran AMOLED lumineux. Suivi cardiaque continu, GPS intégré, plus de 100 modes sportifs et autonomie de 14 jours. Le compagnon idéal de vos entraînements.",
    details:
      'Écran AMOLED 1.43" · GPS · Cardiomètre · Étanche 5ATM · 14 jours',
    price: 149.99,
    oldPrice: 199.99,
    image: "/images/products/photo-1523275335684-37898b6baf30.jpg",
    gallery:
      '["/images/products/photo-1523275335684-37898b6baf30.jpg"]',
    categoryId: "cmu0ebze30001ox4rsm93ckwn",
    stock: 31,
    rating: 4,
    reviewCount: 86,
    soldCount: 180,
    isFeatured: true,
    isNew: false,
    isActive: true,
    sizes: "[]",
    colors: '["Noir","Argent"]',
    createdAt: new Date("2026-09-13T18:39:13.901Z"),
    updatedAt: new Date("2026-09-16T20:57:20.052Z"),
  },
  {
    id: "cmu0ebzeb000fox4r09zzst6r",
    name: "Haltères Ajustables",
    slug: "halteres-ajustables",
    description:
      "Paire d'haltères ajustables de 2 à 24 kg. Système de changement de poids rapide et sûr, revêtement antidérapant et format compact gain de place. Toute une salle de sport dans un seul équipement.",
    details:
      "2-24 kg par haltère · Réglage rapide · Revêtement caoutchouc · Poignée antiglisse",
    price: 199.99,
    oldPrice: 249.99,
    image: "/images/products/photo-1534438327276-14e5300c3a48.jpg",
    gallery:
      '["/images/products/photo-1534438327276-14e5300c3a48.jpg","/images/products/photo-1571902943202-507ec2618e8f.jpg"]',
    categoryId: "cmu0ebze40003ox4rmv19o1of",
    stock: 25,
    rating: 4,
    reviewCount: 86,
    soldCount: 98,
    isFeatured: true,
    isNew: false,
    isActive: true,
    sizes: "[]",
    colors: '["Noir"]',
    createdAt: new Date("2026-09-13T17:39:13.901Z"),
    updatedAt: new Date("2026-09-14T09:08:58.757Z"),
  },
  {
    id: "cmu0ebzec000hox4rwa5g3v8z",
    name: "Coussin Décoratif",
    slug: "coussin-decoratif",
    description:
      "Coussin décoratif en tissu doux et texturé, pour apporter une touche chaleureuse à votre salon ou chambre. Housse déhoussable et lavable, garnissage moelleux qui retrouve sa forme.",
    details: "45×45 cm · Housse déhoussable · Tissu bouclé · Lavable 30°",
    price: 19.99,
    oldPrice: null,
    image: "/images/products/photo-1579656381226-5fc0f0100c3b.jpg",
    gallery:
      '["/images/products/photo-1579656381226-5fc0f0100c3b.jpg","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
    categoryId: "cmu0ebze30002ox4rtnuz0gez",
    stock: 200,
    rating: 4,
    reviewCount: 86,
    soldCount: 154,
    isFeatured: false,
    isNew: false,
    isActive: true,
    sizes: "[]",
    colors: '["Beige","Terracotta","Vert sauge"]',
    createdAt: new Date("2026-09-13T16:39:13.901Z"),
    updatedAt: new Date("2026-09-14T09:08:58.757Z"),
  },
  {
    id: "cmu0ebzec000jox4r8p8lu6mh",
    name: "Sac à dos Urbain",
    slug: "sac-a-dos-urbain",
    description:
      'Sac à dos urbain minimaliste avec compartiment rembourré pour ordinateur portable 15". Tissu imperméable, dos ergonomique respirant et poche antivol cachée. L\'accessoire indispensable du quotidien.',
    details: '20L · Compartiment 15" · Imperméable · Poche antivol · USB',
    price: 49.99,
    oldPrice: null,
    image: "/images/products/photo-1553062407-98eeb64c6a62.jpg",
    gallery:
      '["/images/products/photo-1553062407-98eeb64c6a62.jpg","/images/products/photo-1441986300917-64674bd600d8.jpg"]',
    categoryId: "cmu0ebze10000ox4r8ci7w4zl",
    stock: 80,
    rating: 4,
    reviewCount: 86,
    soldCount: 231,
    isFeatured: false,
    isNew: true,
    isActive: true,
    sizes: "[]",
    colors: '["Noir","Gris"]',
    createdAt: new Date("2026-09-13T15:39:13.901Z"),
    updatedAt: new Date("2026-09-14T09:08:58.758Z"),
  },
  {
    id: "cmu0f7wdv0001ox7tvvobcg8p",
    name: "Enceinte Bluetooth Nomade",
    slug: "enceinte-bluetooth-nomade",
    description:
      "Enceinte portable au son puissant et équilibré, habillée d'un tissu textile premium. Autonomie de 20 heures, résistance aux éclaboussures IPX6 et appairage stéréo possible entre deux enceintes. Votre bande-son où que vous soyez.",
    details: "20h autonomie · IPX6 · Bluetooth 5.3 · Appairage stéréo · 580 g",
    price: 59.99,
    oldPrice: 79.99,
    image: "/images/products/gen-enceinte.png",
    gallery:
      '["/images/products/gen-enceinte.png","/images/products/photo-1505740420928-5e560c06d30e.jpg"]',
    categoryId: "cmu0ebze30001ox4rsm93ckwn",
    stock: 45,
    rating: 4,
    reviewCount: 124,
    soldCount: 265,
    isFeatured: true,
    isNew: true,
    isActive: true,
    sizes: "[]",
    colors: '["Noir","Bleu nuit","Gris"]',
    createdAt: new Date("2026-09-13T13:04:02.994Z"),
    updatedAt: new Date("2026-09-14T09:08:58.759Z"),
  },
  {
    id: "cmu0f7wdx0003ox7trzzsg2k5",
    name: "Bougie Parfumée Artisanale",
    slug: "bougie-parfumee-artisanale",
    description:
      "Bougie coulée à la main dans un verre ambré, cire de soja naturelle et mèche en bois qui crépite doucement. Une trentaine d'heures de diffusion pour une ambiance chaleureuse et apaisante dès les premières minutes.",
    details:
      "Cire de soja · Mèche en bois · ~30h · Verre ambré réutilisable · Fabriquée en France",
    price: 24.99,
    oldPrice: 32.99,
    image: "/images/products/gen-bougie.png",
    gallery:
      '["/images/products/gen-bougie.png","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
    categoryId: "cmu0ebze30002ox4rtnuz0gez",
    stock: 120,
    rating: 5,
    reviewCount: 89,
    soldCount: 187,
    isFeatured: false,
    isNew: true,
    isActive: true,
    sizes: "[]",
    colors: '["Vanille","Santal","Cannelle"]',
    createdAt: new Date("2026-09-13T12:04:02.997Z"),
    updatedAt: new Date("2026-09-14T09:08:58.759Z"),
  },
  {
    id: "cmu0f7wdz0005ox7tqs29ui1n",
    name: "Sneakers Urbaines Classic",
    slug: "sneakers-urbaines-classic",
    description:
      "Sneakers au style intemporel, tige en cuir grainé et semelle caoutchouc confortable. Un design épuré qui accompagne toutes vos tenues, du jean au costume, avec un confort remarquable dès la première marche.",
    details:
      "Cuir grainé · Semelle caoutchouc · Doublure respirante · Unisexe",
    price: 94.99,
    oldPrice: 119.99,
    image: "/images/products/gen-sneakers.png",
    gallery:
      '["/images/products/gen-sneakers.png","/images/products/photo-1441986300917-64674bd600d8.jpg"]',
    categoryId: "cmu0ebze10000ox4r8ci7w4zl",
    stock: 38,
    rating: 4,
    reviewCount: 210,
    soldCount: 398,
    isFeatured: true,
    isNew: true,
    isActive: true,
    sizes: '["39","40","41","42","43","44","45"]',
    colors: '["Blanc","Noir"]',
    createdAt: new Date("2026-09-13T11:04:02.998Z"),
    updatedAt: new Date("2026-09-14T09:08:58.760Z"),
  },
  {
    id: "cmu0f7we00007ox7tk0z9mfii",
    name: "Lunettes de Soleil Rétro",
    slug: "lunettes-soleil-retro",
    description:
      "Lunettes de soleil à la monture métal fine dorée et verres dégradés catégoriel 3. Une silhouette rétro-chic légère (21 g) qui protège vos yeux avec style, étui rigide et chiffon microfibre inclus.",
    details: "Verres cat. 3 UV400 · Monture métal · 21 g · Étui rigide inclus",
    price: 39.99,
    oldPrice: null,
    image: "/images/products/gen-lunettes.png",
    gallery: '["/images/products/gen-lunettes.png"]',
    categoryId: "cmu0ebze10000ox4r8ci7w4zl",
    stock: 75,
    rating: 4,
    reviewCount: 67,
    soldCount: 143,
    isFeatured: false,
    isNew: true,
    isActive: true,
    sizes: "[]",
    colors: '["Or","Noir"]',
    createdAt: new Date("2026-09-13T10:04:02.999Z"),
    updatedAt: new Date("2026-09-14T09:08:58.760Z"),
  },
  {
    id: "cmu0f7we10009ox7tgajie5fs",
    name: "Service à Thé Céramique",
    slug: "service-a-the-ceramique",
    description:
      "Service à thé en céramique émaillée crème aux finitions dorées : une théière 800 ml et deux tasses élégantes. Un moment de dégustation raffiné à offrir ou s'offrir, livré dans un coffret cadeau soigné.",
    details:
      "Théière 800 ml · 2 tasses · Céramique émaillée · Finitions dorées · Coffret cadeau",
    price: 44.99,
    oldPrice: 54.99,
    image: "/images/products/gen-the.png",
    gallery:
      '["/images/products/gen-the.png","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
    categoryId: "cmu0ebze30002ox4rtnuz0gez",
    stock: 30,
    rating: 5,
    reviewCount: 45,
    soldCount: 76,
    isFeatured: false,
    isNew: false,
    isActive: true,
    sizes: "[]",
    colors: '["Crème","Vert sauge"]',
    createdAt: new Date("2026-09-13T09:04:03.001Z"),
    updatedAt: new Date("2026-09-14T09:08:58.761Z"),
  },
  {
    id: "cmu0f7we2000box7tchdd6ose",
    name: "Gourde Isotherme Inox",
    slug: "gourde-isotherme-inox",
    description:
      "Gourde isotherme en inox double paroi : 24h de froid, 12h de chaud. Finition mate anti-traces, bouchon étanche à double joint et bouche large compatible avec les glaçons. L'alliée zéro déchet de vos journées.",
    details:
      "750 ml · Inox 18/8 · 24h froid / 12h chaud · Sans BPA · Bouchon étanche",
    price: 27.99,
    oldPrice: null,
    image: "/images/products/gen-gourde.png",
    gallery:
      '["/images/products/gen-gourde.png","/images/products/photo-1571902943202-507ec2618e8f.jpg"]',
    categoryId: "cmu0ebze40003ox4rmv19o1of",
    stock: 150,
    rating: 4,
    reviewCount: 156,
    soldCount: 312,
    isFeatured: false,
    isNew: true,
    isActive: true,
    sizes: "[]",
    colors: '["Noir mat","Argent"]',
    createdAt: new Date("2026-09-13T08:04:03.002Z"),
    updatedAt: new Date("2026-09-14T09:08:58.762Z"),
  },
]

async function main() {
  console.log("🌱 Seed MignonciteShop — démarrage…")

  // Idempotence : on vide les tables (les produits d'abord, à cause de la FK)
  const deletedProducts = await prisma.product.deleteMany()
  const deletedCategories = await prisma.category.deleteMany()
  console.log(
    `🗑  Tables vidées : ${deletedProducts.count} produit(s), ${deletedCategories.count} catégorie(s)`
  )

  await prisma.category.createMany({ data: categories })
  console.log(`✅ ${categories.length} catégories créées`)

  await prisma.product.createMany({ data: products })
  console.log(`✅ ${products.length} produits créés`)

  // Codes promo (upsert — jamais de doublon, réactivation à chaque seed)
  for (const promo of PROMOS) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: { label: promo.label, type: promo.type, value: promo.value, minSubtotal: promo.minSubtotal, isActive: true },
      create: { ...promo, isActive: true },
    })
  }
  console.log(`✅ ${PROMOS.length} codes promo prêts`)

  // Administrateur (upsert par email)
  const passwordHash = await bcrypt.hash(ADMIN.password, 10)
  await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: { role: "admin", password: passwordHash, name: ADMIN.name },
    create: { email: ADMIN.email, name: ADMIN.name, password: passwordHash, role: "admin" },
  })
  console.log(`✅ Administrateur : ${ADMIN.email}`)

  // Vérification
  const catCount = await prisma.category.count()
  const prodCount = await prisma.product.count()
  console.log(`📊 Vérification : ${catCount} catégories, ${prodCount} produits en base`)

  if (catCount !== 4 || prodCount !== 14) {
    throw new Error("Seed incomplet ! Attendu : 4 catégories et 14 produits.")
  }

  console.log("🌱 Seed terminé avec succès.")
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le seed :", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
