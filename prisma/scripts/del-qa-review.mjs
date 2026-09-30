import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
await db.$executeRawUnsafe('DELETE FROM `Review` WHERE `id` = ?', 'cmu0mba5n0005oxnrg8rc6dqp')
console.log('avis QA supprimé')
await db.$disconnect()
