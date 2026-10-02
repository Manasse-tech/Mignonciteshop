import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const targets = [
  { author: 'Sophie M.', photos: '["/images/products/photo-1591047139829-d91aecb6caea.jpg","/images/products/photo-1445205170230-053b83016050.jpg"]' },
  { author: 'Yanis K.', photos: '["/images/products/gen-enceinte.png"]' },
  { author: 'Inès R.', photos: '["/images/products/gen-bougie.png"]' },
]
for (const t of targets) {
  const res = await db.$executeRawUnsafe('UPDATE `Review` SET `photos` = ? WHERE `author` = ?', t.photos, t.author)
  console.log(t.author, '→', res, 'ligne(s)')
}
await db.$disconnect()
