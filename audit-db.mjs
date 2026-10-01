import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const counts = {
  categories: await db.category.count(),
  products: await db.product.count(),
  users: await db.user.count(),
  admins: await db.user.count({ where: { role: 'admin' } }),
  orders: await db.order.count(),
  promos: await db.promoCode.count(),
  reviews: await db.review.count(),
}
console.log(JSON.stringify(counts))
const admin = await db.user.findMany({ where: { role: 'admin' }, select: { email: true, name: true } })
console.log('admins:', JSON.stringify(admin))
const cats = await db.category.findMany({ select: { name: true, slug: true } })
console.log('categories:', JSON.stringify(cats))
await db.$disconnect()
