import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const o = await db.order.findFirst({ where: { customerEmail: 'fid2@test.fr' } })
if (o) {
  await db.orderItem.deleteMany({ where: { orderId: o.id } })
  await db.order.delete({ where: { id: o.id } })
  console.log('commande FID2 supprimée:', o.orderNumber)
} else console.log('aucune commande FID2')
// restaure la veste (stock 9, soldCount 342 = valeurs seed/QA précédentes)
await db.product.update({ where: { id: 'cmu0ebze50005ox4r7cnaxkhq' }, data: { stock: 9, soldCount: 342 } })
const p = await db.product.findUnique({ where: { id: 'cmu0ebze50005ox4r7cnaxkhq' } })
console.log('veste restaurée:', p.stock, p.soldCount)
await db.$disconnect()
