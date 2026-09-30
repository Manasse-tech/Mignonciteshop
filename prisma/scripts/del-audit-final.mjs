import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const u = await db.user.findUnique({ where: { email: 'audit-final@test.com' } })
if (u) {
  await db.user.delete({ where: { id: u.id } })
  console.log('compte local audit-final supprimé')
} else {
  console.log('compte local déjà absent')
}
await db.$disconnect()
