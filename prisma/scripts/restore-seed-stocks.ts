import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Restaure les stocks d'origine du seed (dérive QA) :
//   « Veste Légère Premium »        : 23 → 9
//   « Sneakers Urbaines Classic »   : 37 → 38
async function main() {
  const veste = await db.product.update({
    where: { slug: 'veste-legere-premium' },
    data: { stock: 9 },
  })
  console.log(`restauré : ${veste.name} → stock=${veste.stock}`)

  const sneakers = await db.product.update({
    where: { slug: 'sneakers-urbaines-classic' },
    data: { stock: 38 },
  })
  console.log(`restauré : ${sneakers.name} → stock=${sneakers.stock}`)

  // Vérification en lecture (name + stock)
  const check = await db.product.findMany({
    where: { slug: { in: ['veste-legere-premium', 'sneakers-urbaines-classic'] } },
    select: { name: true, stock: true },
    orderBy: { name: 'asc' },
  })
  console.log('vérification :')
  for (const p of check) console.log(`  ${p.name} → stock=${p.stock}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
