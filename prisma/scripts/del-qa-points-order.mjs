import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const o = await db.order.findFirst({ where: { orderNumber: 'MCS-AO7BY06A' } })
if (o) {
  await db.orderItem.deleteMany({ where: { orderId: o.id } })
  await db.order.delete({ where: { id: o.id } })
  await db.$executeRawUnsafe('UPDATE `Product` SET `stock` = 23, `soldCount` = 342 WHERE `slug` = ?', 'veste-legere-premium')
  console.log('commande QA supprimée, veste restaurée (stock 23, soldCount 342)')
} else console.log('aucune commande QA')
await db.$disconnect()
