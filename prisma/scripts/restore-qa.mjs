import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
// Restaure stock + soldCount de la gourde après le test QA
const p = await db.product.findFirst({ where: { slug: 'gourde-isotherme-inox' } })
await db.$executeRawUnsafe('UPDATE `Product` SET `stock` = 150, `soldCount` = 312 WHERE `id` = ?', p.id)
console.log('restored gourde: stock=150 soldCount=312')
const left = await db.$queryRawUnsafe('SELECT COUNT(*) as n FROM `Order` WHERE `customerEmail` = ?', 'qa@test.com')
console.log('commandes QA restantes:', left[0].n)
await db.$disconnect()
