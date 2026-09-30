import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const old = await prisma.user.findUnique({ where: { email: 'admin@mignonciteshop.fr' } })
if (old) {
  const linked = await prisma.order.count({ where: { userId: old.id } })
  if (linked > 0) { console.log('Commandes liées, suppression refusée'); process.exit(1) }
  await prisma.user.delete({ where: { id: old.id } })
  console.log('✓ Ancien admin de test supprimé : admin@mignonciteshop.fr')
} else console.log('Aucun ancien admin trouvé')
const users = await prisma.user.findMany({ select: { email: true, role: true } })
console.log('Comptes restants :', JSON.stringify(users))
await prisma.$disconnect()
