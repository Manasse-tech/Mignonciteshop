import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const baselines = {
  'veste-legere-premium': 342, 'lampe-led-design': 128, 'tapis-de-yoga-pro': 215,
  'ecouteurs-bluetooth-pro': 487, 'montre-connectee-sport': 176, 'halteres-ajustables': 98,
  'coussin-decoratif': 154, 'sac-a-dos-urbain': 231, 'enceinte-bluetooth-nomade': 265,
  'bougie-parfumee-artisanale': 187, 'sneakers-urbaines-classic': 398, 'lunettes-soleil-retro': 143,
  'service-a-the-ceramique': 76, 'gourde-isotherme-inox': 312,
}
for (const [slug, n] of Object.entries(baselines)) {
  await db.$executeRawUnsafe('UPDATE `Product` SET `soldCount` = ? WHERE `slug` = ?', n, slug)
}
console.log('soldCount baselines OK')
await db.$disconnect()
