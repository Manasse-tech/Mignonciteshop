import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: 'Mode', slug: 'mode', description: 'Vêtements et accessoires de mode tendance', image: '/images/products/photo-1445205170230-053b83016050.jpg', order: 1 },
  { name: 'Électronique', slug: 'electronique', description: 'High-tech et gadgets connectés', image: '/images/products/photo-1498049794561-7780e7231661.jpg', order: 2 },
  { name: 'Maison & Déco', slug: 'maison-deco', description: 'Tout pour embellir votre intérieur', image: '/images/products/photo-1616486338812-3dadae4b4ace.jpg', order: 3 },
  { name: 'Sport & Loisirs', slug: 'sport-loisirs', description: 'Équipement sportif et loisirs', image: '/images/products/photo-1571902943202-507ec2618e8f.jpg', order: 4 },
]

const products = [
  {
    name: 'Veste Légère Premium',
    slug: 'veste-legere-premium',
    description: 'Une veste légère et élégante, confectionnée dans un tissu technique déperlant. Coupe ajustée, finitions soignées et confort optimal pour la mi-saison. Parfaite pour un look urbain chic en toutes circonstances.',
    details: 'Tissu déperlant · Doublure respirante · Fermeture éclair YKK · Poches zippées',
    price: 79.99, oldPrice: 99.99,
    image: '/images/products/photo-1591047139829-d91aecb6caea.jpg',
    categorySlug: 'mode', stock: 9, rating: 4, reviewCount: 86, soldCount: 342, isFeatured: true, isNew: true,
    sizes: '["S","M","L","XL"]', colors: '["Noir","Beige","Bleu marine"]',
    gallery: '["/images/products/photo-1591047139829-d91aecb6caea.jpg","/images/products/photo-1445205170230-053b83016050.jpg"]',
  },
  {
    name: 'Lampe LED Design',
    slug: 'lampe-led-design',
    description: 'Lampe LED au design épuré et moderne. Éclairage d\'ambiance tamisé, intensité réglable et finition mate premium. Un objet décoratif qui sublime votre intérieur tout en consommant très peu d\'énergie.',
    details: 'LED 8W · Intensité réglable · USB-C · Finition mate',
    price: 34.99, oldPrice: null,
    image: '/images/products/photo-1507473885765-e6ed057f782c.jpg',
    categorySlug: 'maison-deco', stock: 100, rating: 4, reviewCount: 86, soldCount: 128, isFeatured: false, isNew: false,
    sizes: '[]', colors: '["Blanc","Noir"]',
    gallery: '["/images/products/photo-1507473885765-e6ed057f782c.jpg","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
  },
  {
    name: 'Tapis de Yoga Pro',
    slug: 'tapis-de-yoga-pro',
    description: 'Tapis de yoga professionnel antidérapant, épais et confortable. Surface texturée pour une adhérence maximale même en transpiration, marques d\'alignement discrètes et sangle de transport offerte.',
    details: 'Épaisseur 6mm · Antidérapant TPE · Sans odeur · Sangle incluse',
    price: 29.99, oldPrice: 39.99,
    image: '/images/products/photo-1601925260368-ae2f83cf8b7f.jpg',
    categorySlug: 'sport-loisirs', stock: 60, rating: 4, reviewCount: 86, soldCount: 215, isFeatured: true, isNew: false,
    sizes: '[]', colors: '["Violet","Bleu","Noir"]',
    gallery: '["/images/products/photo-1601925260368-ae2f83cf8b7f.jpg","/images/products/photo-1571902943202-507ec2618e8f.jpg"]',
  },
  {
    name: 'Écouteurs Bluetooth Pro',
    slug: 'ecouteurs-bluetooth-pro',
    description: 'Écouteurs sans fil à réduction de bruit active. Son haute fidélité, autonomie exceptionnelle de 30h avec le boîtier, appairage instantané et résistance à l\'eau IPX5 pour accompagner toutes vos activités.',
    details: 'ANC actif · 30h autonomie · Bluetooth 5.3 · IPX5 · Boîtier de charge',
    price: 89.99, oldPrice: 129.99,
    image: '/images/products/photo-1505740420928-5e560c06d30e.jpg',
    categorySlug: 'electronique', stock: 50, rating: 4, reviewCount: 86, soldCount: 487, isFeatured: true, isNew: true,
    sizes: '[]', colors: '["Noir","Blanc"]',
    gallery: '["/images/products/photo-1505740420928-5e560c06d30e.jpg","/images/products/photo-1498049794561-7780e7231661.jpg"]',
  },
  {
    name: 'Montre Connectée Sport',
    slug: 'montre-connectee-sport',
    description: 'Montre connectée multi-sport avec écran AMOLED lumineux. Suivi cardiaque continu, GPS intégré, plus de 100 modes sportifs et autonomie de 14 jours. Le compagnon idéal de vos entraînements.',
    details: 'Écran AMOLED 1.43" · GPS · Cardiomètre · Étanche 5ATM · 14 jours',
    price: 149.99, oldPrice: 199.99,
    image: '/images/products/photo-1523275335684-37898b6baf30.jpg',
    categorySlug: 'electronique', stock: 35, rating: 4, reviewCount: 86, soldCount: 176, isFeatured: true, isNew: false,
    sizes: '[]', colors: '["Noir","Argent"]',
    gallery: '["/images/products/photo-1523275335684-37898b6baf30.jpg"]',
  },
  {
    name: 'Haltères Ajustables',
    slug: 'halteres-ajustables',
    description: 'Paire d\'haltères ajustables de 2 à 24 kg. Système de changement de poids rapide et sûr, revêtement antidérapant et format compact gain de place. Toute une salle de sport dans un seul équipement.',
    details: '2-24 kg par haltère · Réglage rapide · Revêtement caoutchouc · Poignée antiglisse',
    price: 199.99, oldPrice: 249.99,
    image: '/images/products/photo-1534438327276-14e5300c3a48.jpg',
    categorySlug: 'sport-loisirs', stock: 25, rating: 4, reviewCount: 86, soldCount: 98, isFeatured: true, isNew: false,
    sizes: '[]', colors: '["Noir"]',
    gallery: '["/images/products/photo-1534438327276-14e5300c3a48.jpg","/images/products/photo-1571902943202-507ec2618e8f.jpg"]',
  },
  {
    name: 'Coussin Décoratif',
    slug: 'coussin-decoratif',
    description: 'Coussin décoratif en tissu doux et texturé, pour apporter une touche chaleureuse à votre salon ou chambre. Housse déhoussable et lavable, garnissage moelleux qui retrouve sa forme.',
    details: '45×45 cm · Housse déhoussable · Tissu bouclé · Lavable 30°',
    price: 19.99, oldPrice: null,
    image: '/images/products/photo-1579656381226-5fc0f0100c3b.jpg',
    categorySlug: 'maison-deco', stock: 200, rating: 4, reviewCount: 86, soldCount: 154, isFeatured: false, isNew: false,
    sizes: '[]', colors: '["Beige","Terracotta","Vert sauge"]',
    gallery: '["/images/products/photo-1579656381226-5fc0f0100c3b.jpg","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
  },
  {
    name: 'Sac à dos Urbain',
    slug: 'sac-a-dos-urbain',
    description: 'Sac à dos urbain minimaliste avec compartiment rembourré pour ordinateur portable 15". Tissu imperméable, dos ergonomique respirant et poche antivol cachée. L\'accessoire indispensable du quotidien.',
    details: '20L · Compartiment 15" · Imperméable · Poche antivol · USB',
    price: 49.99, oldPrice: null,
    image: '/images/products/photo-1553062407-98eeb64c6a62.jpg',
    categorySlug: 'mode', stock: 80, rating: 4, reviewCount: 86, soldCount: 231, isFeatured: false, isNew: true,
    sizes: '[]', colors: '["Noir","Gris"]',
    gallery: '["/images/products/photo-1553062407-98eeb64c6a62.jpg","/images/products/photo-1441986300917-64674bd600d8.jpg"]',
  },
  // ===== Produits ajoutés (extension catalogue, non présents dans le ZIP d'origine) =====
  {
    name: 'Enceinte Bluetooth Nomade',
    slug: 'enceinte-bluetooth-nomade',
    description: 'Enceinte portable au son puissant et équilibré, habillée d\'un tissu textile premium. Autonomie de 20 heures, résistance aux éclaboussures IPX6 et appairage stéréo possible entre deux enceintes. Votre bande-son où que vous soyez.',
    details: '20h autonomie · IPX6 · Bluetooth 5.3 · Appairage stéréo · 580 g',
    price: 59.99, oldPrice: 79.99,
    image: '/images/products/gen-enceinte.png',
    categorySlug: 'electronique', stock: 45, rating: 4, reviewCount: 124, soldCount: 265, isFeatured: true, isNew: true,
    sizes: '[]', colors: '["Noir","Bleu nuit","Gris"]',
    gallery: '["/images/products/gen-enceinte.png","/images/products/photo-1505740420928-5e560c06d30e.jpg"]',
  },
  {
    name: 'Bougie Parfumée Artisanale',
    slug: 'bougie-parfumee-artisanale',
    description: 'Bougie coulée à la main dans un verre ambré, cire de soja naturelle et mèche en bois qui crépite doucement. Une trentaine d\'heures de diffusion pour une ambiance chaleureuse et apaisante dès les premières minutes.',
    details: 'Cire de soja · Mèche en bois · ~30h · Verre ambré réutilisable · Fabriquée en France',
    price: 24.99, oldPrice: 32.99,
    image: '/images/products/gen-bougie.png',
    categorySlug: 'maison-deco', stock: 120, rating: 5, reviewCount: 89, soldCount: 187, isFeatured: false, isNew: true,
    sizes: '[]', colors: '["Vanille","Santal","Cannelle"]',
    gallery: '["/images/products/gen-bougie.png","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
  },
  {
    name: 'Sneakers Urbaines Classic',
    slug: 'sneakers-urbaines-classic',
    description: 'Sneakers au style intemporel, tige en cuir grainé et semelle caoutchouc confortable. Un design épuré qui accompagne toutes vos tenues, du jean au costume, avec un confort remarquable dès la première marche.',
    details: 'Cuir grainé · Semelle caoutchouc · Doublure respirante · Unisexe',
    price: 94.99, oldPrice: 119.99,
    image: '/images/products/gen-sneakers.png',
    categorySlug: 'mode', stock: 38, rating: 4, reviewCount: 210, soldCount: 398, isFeatured: true, isNew: true,
    sizes: '["39","40","41","42","43","44","45"]', colors: '["Blanc","Noir"]',
    gallery: '["/images/products/gen-sneakers.png","/images/products/photo-1441986300917-64674bd600d8.jpg"]',
  },
  {
    name: 'Lunettes de Soleil Rétro',
    slug: 'lunettes-soleil-retro',
    description: 'Lunettes de soleil à la monture métal fine dorée et verres dégradés catégoriel 3. Une silhouette rétro-chic légère (21 g) qui protège vos yeux avec style, étui rigide et chiffon microfibre inclus.',
    details: 'Verres cat. 3 UV400 · Monture métal · 21 g · Étui rigide inclus',
    price: 39.99, oldPrice: null,
    image: '/images/products/gen-lunettes.png',
    categorySlug: 'mode', stock: 75, rating: 4, reviewCount: 67, soldCount: 143, isFeatured: false, isNew: true,
    sizes: '[]', colors: '["Or","Noir"]',
    gallery: '["/images/products/gen-lunettes.png"]',
  },
  {
    name: 'Service à Thé Céramique',
    slug: 'service-a-the-ceramique',
    description: 'Service à thé en céramique émaillée crème aux finitions dorées : une théière 800 ml et deux tasses élégantes. Un moment de dégustation raffiné à offrir ou s\'offrir, livré dans un coffret cadeau soigné.',
    details: 'Théière 800 ml · 2 tasses · Céramique émaillée · Finitions dorées · Coffret cadeau',
    price: 44.99, oldPrice: 54.99,
    image: '/images/products/gen-the.png',
    categorySlug: 'maison-deco', stock: 30, rating: 5, reviewCount: 45, soldCount: 76, isFeatured: false, isNew: false,
    sizes: '[]', colors: '["Crème","Vert sauge"]',
    gallery: '["/images/products/gen-the.png","/images/products/photo-1616486338812-3dadae4b4ace.jpg"]',
  },
  {
    name: 'Gourde Isotherme Inox',
    slug: 'gourde-isotherme-inox',
    description: 'Gourde isotherme en inox double paroi : 24h de froid, 12h de chaud. Finition mate anti-traces, bouchon étanche à double joint et bouche large compatible avec les glaçons. L\'alliée zéro déchet de vos journées.',
    details: '750 ml · Inox 18/8 · 24h froid / 12h chaud · Sans BPA · Bouchon étanche',
    price: 27.99, oldPrice: null,
    image: '/images/products/gen-gourde.png',
    categorySlug: 'sport-loisirs', stock: 150, rating: 4, reviewCount: 156, soldCount: 312, isFeatured: false, isNew: true,
    sizes: '[]', colors: '["Noir mat","Argent"]',
    gallery: '["/images/products/gen-gourde.png","/images/products/photo-1571902943202-507ec2618e8f.jpg"]',
  },
]

const demoReviews = [
  { productSlug: 'veste-legere-premium', author: 'Sophie M.', rating: 5, title: 'Superbe qualité', content: 'Très belle veste, la coupe est parfaite et le tissu est de qualité. Livraison rapide, je recommande !', status: 'approved', photos: '["/images/products/photo-1591047139829-d91aecb6caea.jpg","/images/products/photo-1445205170230-053b83016050.jpg"]' },
  { productSlug: 'veste-legere-premium', author: 'Thomas L.', rating: 4, title: 'Très satisfaite', content: 'Bonne veste pour la mi-saison. Légère et élégante. Je retire une étoile car je l\'aurais aimée un peu plus chaude.', status: 'approved' },
  { productSlug: 'ecouteurs-bluetooth-pro', author: 'Karim B.', rating: 5, title: 'Incroyable', content: 'La réduction de bruit est impressionnante pour ce prix. L\'autonomie tient vraiment les 30h annoncées avec le boîtier.', status: 'approved' },
  { productSlug: 'montre-connectee-sport', author: 'Amina D.', rating: 5, title: 'Excellent rapport qualité/prix', content: 'Très belle montre, l\'écran est magnifique et le suivi sportif complet. Parfaite pour la course à pied.', status: 'approved' },
  { productSlug: 'tapis-de-yoga-pro', author: 'Claire P.', rating: 4, title: 'Confortable', content: 'Épais et antidérapant, parfait pour le yoga et le pilates. L\'odeur initiale disparaît après quelques jours.', status: 'approved' },
  { productSlug: 'halteres-ajustables', author: 'Mehdi R.', rating: 5, title: 'Gain de place génial', content: 'Remplace 15 paires d\'haltères ! Le système de réglage est fluide et sûr. Un investissement rentable.', status: 'approved' },
  { productSlug: 'sac-a-dos-urbain', author: 'Julie N.', rating: 5, title: 'Pratique au quotidien', content: 'Mon ordinateur est bien protégé et la poche antivol est vraiment rassurante dans les transports. Design sobre et chic.', status: 'approved' },
  { productSlug: 'lampe-led-design', author: 'Pierre F.', rating: 4, title: 'Très design', content: 'Belle lampe d\'ambiance, la lumière est douce et l\'intensité réglable est très pratique le soir.', status: 'pending' },
  { productSlug: 'coussin-decoratif', author: 'Léa G.', rating: 5, title: 'Touche déco parfaite', content: 'Le tissu bouclé est super agréable, la couleur beige se marie avec tout. Mon salon a changé de look !', status: 'approved' },
  // Avis des produits ajoutés (extension catalogue)
  { productSlug: 'enceinte-bluetooth-nomade', author: 'Yanis K.', rating: 5, title: 'Son impressionnant', content: 'Un son énorme pour cette taille ! L\'appairage est instantané et l\'autonomie est vraiment au rendez-vous. Très bonne surprise.', status: 'approved', photos: '["/images/products/gen-enceinte.png"]' },
  { productSlug: 'enceinte-bluetooth-nomade', author: 'Manon T.', rating: 4, title: 'Très bien pour les sorties', content: 'Embarquée partout en vacances, quelques éclaboussures à la piscine sans aucun problème. Les basses pourraient être un peu plus profondes.', status: 'approved' },
  { productSlug: 'bougie-parfumee-artisanale', author: 'Inès R.', rating: 5, title: 'Odeur divine', content: 'La mèche en bois qui crépite, c\'est un vrai moment cocooning. Le verre ambré est très joli, je l\'ai réutilisé en pot à pinceaux.', status: 'approved', photos: '["/images/products/gen-bougie.png"]' },
  { productSlug: 'sneakers-urbaines-classic', author: 'Lucas P.', rating: 5, title: 'Confort immédiat', content: 'Portées toute la journée dès le premier jour, aucune douleur. Le cuir est de belle qualité, elles se patinent très bien.', status: 'approved' },
  { productSlug: 'lunettes-soleil-retro', author: 'Camille D.', rating: 4, title: 'Très élégantes', content: 'La monture dorée est fine et légère, on oublie qu\'on les porte. Les verres dégradés sont très jolies. L\'étui rigide est un plus.', status: 'approved' },
  { productSlug: 'service-a-the-ceramique', author: 'Nathalie V.', rating: 5, title: 'Magnifique coffret', content: 'Offert à ma mère qui en est ravie. La céramique est épaisse et bien finie, les liserés dorés sont très élégants.', status: 'approved' },
  { productSlug: 'gourde-isotherme-inox', author: 'Sarah L.', rating: 5, title: 'Indispensable', content: 'L\'eau reste glacée toute la journée au bureau, même sans frigo. La finition mate ne montre pas les traces de doigts.', status: 'approved' },
  { productSlug: 'bougie-parfumee-artisanale', author: 'Hugo M.', rating: 4, title: 'Très bon produit', content: 'Belle diffusion dans une pièce de 20m². J\'aurais aimé une version plus grande pour les soirées.', status: 'pending' },
]

const demoQuestions = [
  {
    productSlug: 'veste-legere-premium',
    author: 'Nadia S.',
    question: 'La veste est-elle imperméable ou seulement déperlante ? Je cherche quelque chose pour les pluies fines.',
    answer: 'Bonjour Nadia, la veste est déperlante (traitement déperlant durable) mais pas entièrement imperméable. Pour de fortes pluies, nous recommandons une couche imperméable supplémentaire.',
    status: 'answered',
    helpfulCount: 3,
  },
  {
    productSlug: 'ecouteurs-bluetooth-pro',
    author: 'Marc D.',
    question: 'Sont-ils compatibles avec la charge sans fil Qi ?',
    answer: 'Bonjour Marc, oui ! Le boîtier est compatible avec tous les chargeurs sans fil Qi standard. La charge complète prend environ 2h sur un tapis Qi 10W.',
    status: 'answered',
  },
  {
    productSlug: 'montre-connectee-sport',
    author: 'Julie R.',
    question: 'Le bracelet est-il interchangeable ? Peut-on le remplacer par un bracelet classique ?',
    answer: 'Bonjour Julie, tout à fait. La montre utilise un attachement standard de 20 mm, compatible avec la majorité des bracelets du marché (cuir, milanais, silicone).',
    status: 'answered',
  },
  {
    productSlug: 'sac-a-dos-urbain',
    author: 'Pierre L.',
    question: 'Quelles sont les dimensions exactes du compartiment ordinateur ? J\'ai un PC 16 pouces avec une coque épaisse.',
    answer: '',
    status: 'pending',
  },
]

async function main() {
  console.log('Nettoyage de la base...')
  await prisma.review.deleteMany()
  await prisma.productQuestion.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.contactMessage.deleteMany()
  await prisma.newsletterSubscriber.deleteMany()
  await prisma.promoCode.deleteMany()

  console.log('Création des catégories...')
  const catMap: Record<string, string> = {}
  for (const c of categories) {
    const cat = await prisma.category.create({ data: c })
    catMap[c.slug] = cat.id
  }

  console.log('Création des produits...')
  const prodMap: Record<string, string> = {}
  const baseTime = Date.now()
  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const { categorySlug, ...data } = p
    // Le premier produit du tableau est le plus récent (ordre "Plus récents" = ordre original)
    const createdAt = new Date(baseTime - i * 60 * 60 * 1000)
    const prod = await prisma.product.create({
      data: { ...data, categoryId: catMap[categorySlug], createdAt, updatedAt: createdAt },
    })
    prodMap[p.slug] = prod.id

    // Historique des prix : point initial + variations démo pour quelques produits
    const daysAgoD = (n: number) => new Date(baseTime - n * 24 * 3600 * 1000)
    const priceVariations: Record<string, Array<{ d: number; price: number; oldPrice: number | null }>> = {
      'veste-legere-premium': [
        { d: 90, price: 89.99, oldPrice: null },
        { d: 60, price: 84.99, oldPrice: 99.99 },
        { d: 30, price: 79.99, oldPrice: 99.99 },
      ],
      'ecouteurs-bluetooth-pro': [
        { d: 75, price: 129.99, oldPrice: null },
        { d: 45, price: 119.99, oldPrice: 149.99 },
        { d: 15, price: 89.99, oldPrice: 149.99 },
      ],
      'lampe-led-design': [
        { d: 80, price: 59.99, oldPrice: null },
        { d: 40, price: 49.99, oldPrice: 79.99 },
        { d: 10, price: 34.99, oldPrice: 79.99 },
      ],
    }
    const variations = priceVariations[p.slug]
    if (variations) {
      for (const v of variations) {
        await prisma.priceHistory.create({
          data: { productId: prod.id, price: v.price, oldPrice: v.oldPrice, createdAt: daysAgoD(v.d) },
        })
      }
    } else {
      await prisma.priceHistory.create({
        data: { productId: prod.id, price: p.price, oldPrice: p.oldPrice ?? null, createdAt: daysAgoD(30) },
      })
    }
  }

  console.log('Création des avis démo...')
  for (const r of demoReviews) {
    const { productSlug, ...data } = r
    await prisma.review.create({
      data: { ...data, productId: prodMap[productSlug] },
    })
  }

  console.log('Création des questions démo...')
  for (const q of demoQuestions) {
    const isAnswered = q.status === 'answered'
    await prisma.productQuestion.create({
      data: {
        productId: prodMap[q.productSlug],
        author: q.author,
        question: q.question,
        answer: isAnswered ? q.answer : null,
        status: q.status,
        answeredAt: isAnswered ? new Date(Date.now() - 2 * 24 * 3600 * 1000) : null,
        createdAt: new Date(Date.now() - (isAnswered ? 5 : 1) * 24 * 3600 * 1000),
        helpfulCount: q.helpfulCount ?? 0,
      },
    })
  }

  console.log('Création des commandes démo...')
  // Dates relatives à maintenant pour que le graphique "Revenus 14 jours" soit toujours vivant
  const daysAgo = (n: number, h = 12) => new Date(Date.now() - n * 24 * 3600 * 1000 - h * 3600 * 1000)
  const orders = [
    {
      orderNumber: 'MCS-H7R4TBKJ',
      customerName: 'Ephraim Nguetta',
      customerEmail: 'ephraimnguetta@gmail.com',
      phone: '0152233437',
      address: 'rivera deux pont',
      city: 'Port-Bouët',
      postalCode: null as string | null,
      country: 'France',
      paymentMethod: 'Paiement à la livraison',
      status: 'confirmee',
      createdAt: daysAgo(0, 2),
      items: [{ slug: 'veste-legere-premium', quantity: 55 }],
    },
    {
      orderNumber: 'MCS-MSI4D6GL',
      customerName: 'Ephraim Nguetta',
      customerEmail: 'ephraimnguetta@gmail.com',
      phone: '0152233437',
      address: 'rivera deux pont',
      city: 'Port-Bouët',
      postalCode: null as string | null,
      country: 'France',
      paymentMethod: 'Paiement à la livraison',
      status: 'confirmee',
      createdAt: daysAgo(1, 3),
      items: [{ slug: 'veste-legere-premium', quantity: 55 }],
    },
    {
      orderNumber: 'MCS-Q5T8LVZR',
      customerName: 'Antoine Lefèvre',
      customerEmail: 'antoine.lefevre@example.com',
      phone: '07 82 33 41 05',
      address: '14 rue du Lac',
      city: 'Bordeaux',
      postalCode: '33000',
      country: 'France',
      paymentMethod: 'PayPal',
      status: 'expediee',
      createdAt: daysAgo(3, 15),
      items: [
        { slug: 'sac-a-dos-urbain', quantity: 1 },
        { slug: 'tapis-de-yoga-pro', quantity: 1 },
      ],
    },
    {
      orderNumber: 'MCS-MPMZDVYO',
      customerName: 'Ephraim Nguetta',
      customerEmail: 'ephraimnguetta@gmail.com',
      phone: '0151233437',
      address: 'Port bouët Gonzagueville',
      city: 'Abidjan',
      postalCode: null as string | null,
      country: 'France',
      paymentMethod: 'Paiement à la livraison',
      status: 'expediee',
      createdAt: daysAgo(4, 6),
      items: [
        { slug: 'veste-legere-premium', quantity: 1 },
        { slug: 'tapis-de-yoga-pro', quantity: 2 },
      ],
    },
    {
      orderNumber: 'MCS-K8P2NXQA',
      customerName: 'Julie Moreau',
      customerEmail: 'julie.moreau@example.com',
      phone: '06 45 78 12 90',
      address: '8 avenue des Roses',
      city: 'Lyon',
      postalCode: '69003',
      country: 'France',
      paymentMethod: 'Carte',
      status: 'livree',
      createdAt: daysAgo(6, 9),
      items: [
        { slug: 'coussin-decoratif', quantity: 2 },
        { slug: 'lampe-led-design', quantity: 1 },
      ],
    },
    {
      orderNumber: 'MCS-Z3W9MDCB',
      customerName: 'Clara Bernard',
      customerEmail: 'clara.bernard@example.com',
      phone: '06 11 55 87 23',
      address: '22 rue Victor Hugo',
      city: 'Nantes',
      postalCode: '44000',
      country: 'France',
      paymentMethod: 'Carte',
      status: 'annulee',
      createdAt: daysAgo(8, 11),
      items: [{ slug: 'montre-connectee-sport', quantity: 1 }],
    },
    {
      orderNumber: 'MCS-MK4K9GCH',
      customerName: 'Ephraim Nguetta',
      customerEmail: 'ephraimnguetta@gmail.com',
      phone: '0151233437',
      address: 'Modeste / modeste nouveau goudron',
      city: 'Grand-Bassam',
      postalCode: null as string | null,
      country: 'France',
      paymentMethod: 'Carte',
      status: 'livree',
      createdAt: daysAgo(9, 2),
      items: [{ slug: 'ecouteurs-bluetooth-pro', quantity: 1 }],
    },
  ]

  for (const o of orders) {
    const items = o.items.map((it) => {
      const prod = products.find((p) => p.slug === it.slug)!
      return { name: prod.name, price: prod.price, image: prod.image, quantity: it.quantity, productId: prodMap[it.slug] }
    })
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const shipping = subtotal >= 50 ? 0 : 5.9
    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        phone: o.phone,
        address: o.address,
        city: o.city,
        postalCode: o.postalCode,
        country: o.country,
        paymentMethod: o.paymentMethod,
        status: o.status,
        subtotal,
        shipping,
        total: subtotal + shipping,
        createdAt: o.createdAt,
        items: { create: items },
      },
    })
  }

  console.log('Création des messages de contact démo...')
  await prisma.contactMessage.create({
    data: {
      name: 'Marie Dupont',
      email: 'marie.dupont@example.com',
      subject: 'Question sur la livraison',
      message: 'Bonjour, je souhaiterais savoir si vous livrez en Belgique et quels sont les délais. Merci d\'avance !',
    },
  })

  await prisma.newsletterSubscriber.create({
    data: { email: 'client.fidele@example.com' },
  })

  console.log('Création des codes promo...')
  const promoCodes = [
    { code: 'BIENVENUE10', type: 'percent', value: 10, label: '-10% sur votre commande' },
    { code: 'MIGNON15', type: 'fixed', value: 15, label: '-15 € immédiats' },
    { code: 'LIVRAISONFREE', type: 'shipping', value: 0, label: 'Livraison offerte' },
  ]
  for (const p of promoCodes) {
    await prisma.promoCode.create({ data: p })
  }

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    reviews: await prisma.review.count(),
    orders: await prisma.order.count(),
  }
  console.log('Seed terminé :', counts)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
