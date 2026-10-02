import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const o = await db.order.findFirst({ where: { customerEmail: 'qa@test.com' } })
if (o) {
  await db.orderItem.deleteMany({ where: { orderId: o.id } })
  await db.order.delete({ where: { id: o.id } })
  console.log('commande QA supprimée:', o.orderNumber)
} else console.log('aucune commande QA')
await db.$disconnect()
