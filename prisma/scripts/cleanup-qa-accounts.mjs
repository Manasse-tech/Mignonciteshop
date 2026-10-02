// Nettoyage QA : commandes de test + compte client test + stock veste restauré
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const del = async (num) => {
  const o = await p.order.findUnique({ where: { orderNumber: num }, include: { items: true } })
  if (!o) return console.log(`${num} : absent`)
  await p.order.delete({ where: { id: o.id } })
  console.log(`${num} : supprimée`)
}
await del('MCS-GVIBSZ53')
await del('MCS-T2N18H5W')
const u = await p.user.findUnique({ where: { email: 'client-test-qa@example.com' } })
if (u) { await p.user.delete({ where: { id: u.id } }); console.log('compte client test : supprimé') }
const veste = await p.product.findUnique({ where: { slug: 'veste-legere-premium' } })
await p.product.update({ where: { id: veste.id }, data: { stock: 9, soldCount: 342 } })
console.log('veste : stock 9 / soldCount 342 restaurés')
console.log('cartItems restants :', await p.cartItem.count())
console.log('orders totales :', await p.order.count())
console.log('users restants :', await p.user.count())
await p.$disconnect()
