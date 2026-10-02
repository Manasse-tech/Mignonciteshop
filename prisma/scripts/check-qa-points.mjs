import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const o = await db.$queryRawUnsafe("SELECT orderNumber, subtotal, discount, total, pointsUsed, customerEmail FROM `Order` WHERE `orderNumber` = 'MCS-AO7BY06A'")
console.log('commande:', JSON.stringify(o[0]))
const prod = await db.$queryRawUnsafe("SELECT name, stock, soldCount FROM `Product` WHERE `slug` = 'veste-legere-premium'")
console.log('produit:', JSON.stringify(prod[0]))
await db.$disconnect()
