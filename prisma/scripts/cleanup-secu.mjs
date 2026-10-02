import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const num = 'MCS-0U2VDFZN'
const order = await db.order.findUnique({ where: { orderNumber: num }, include: { items: true } })
if (order) {
  await db.order.delete({ where: { id: order.id } })
  const veste = await db.product.findUnique({ where: { slug: 'veste-legere-premium' } })
  await db.product.update({ where: { slug: 'veste-legere-premium' }, data: { stock: veste.stock + 1, soldCount: Math.max(0, veste.soldCount - 1) } })
  console.log('commande test supprimée + stock restauré')
} else { console.log('commande déjà nettoyée') }
await db.contactMessage.deleteMany({ where: { email: 'qa@mignoncite.fr' } })
await db.newsletterSubscriber.deleteMany({ where: { email: 'qa-test@mignoncite.fr' } })
const count = await db.order.count()
const after = await db.product.findUnique({ where: { slug: 'veste-legere-premium' } })
console.log(`commandes restantes: ${count} | veste stock: ${after.stock} | soldCount: ${after.soldCount}`)
await db.$disconnect()
