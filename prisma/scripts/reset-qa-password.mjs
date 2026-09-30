import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

// Restaure le mot de passe du compte de test client-qa@test.com → ClientQA1234
// (modifié pendant les tests du flow « mot de passe oublié » — Task 19)
const db = new PrismaClient()

const password = 'ClientQA1234'
const salt = randomBytes(16)
const hash = scryptSync(password, salt, 64)
const passwordHash = `s1$${salt.toString('hex')}$${hash.toString('hex')}`

const u = await db.user.update({
  where: { email: 'client-qa@test.com' },
  data: { passwordHash },
  select: { email: true, role: true },
})
console.log('mot de passe restauré pour', u.email, '(role:', u.role + ')')
await db.$disconnect()
