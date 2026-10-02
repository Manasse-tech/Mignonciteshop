// Backfill : soldCount produit = quantités vendues issues des commandes non annulées
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const orders = await db.order.findMany({ where: { status: { not: 'annulee' } }, include: { items: true } })
const sold = {}
for (const o of orders) for (const it of o.items) {
  if (!it.productId) continue
  sold[it.productId] = (sold[it.productId] || 0) + it.quantity
}
for (const [productId, qty] of Object.entries(sold)) {
  await db.$executeRawUnsafe('UPDATE `Product` SET `soldCount` = ? WHERE `id` = ?', qty, productId)
}
console.log('Backfill done:', JSON.stringify(sold))
const prods = await db.$queryRawUnsafe('SELECT `name`, `soldCount` FROM `Product` ORDER BY `soldCount` DESC LIMIT 6')
console.log(prods)
await db.$disconnect()
