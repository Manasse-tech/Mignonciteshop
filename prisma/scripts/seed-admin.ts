/**
 * Seed du compte administrateur — exécuter : bunx tsx scripts/seed-admin.ts (depuis prisma/)
 * Identifiants : variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD (jamais codées en dur).
 */
import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `s1$${salt.toString('hex')}$${hash.toString('hex')}`
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@mignonciteshop.fr').toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'Mignoncite2026!'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashPassword(password), role: 'admin' },
    })
    console.log(`✓ Administrateur mis à jour : ${email}`)
  } else {
    await prisma.user.create({
      data: { email, passwordHash: hashPassword(password), name: 'Administrateur', role: 'admin' },
    })
    console.log(`✓ Administrateur créé : ${email}`)
  }
  console.log('  Rôle : admin — mot de passe issu de ADMIN_PASSWORD')
}

main()
  .catch((e) => {
    console.error('Seed admin échoué :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
