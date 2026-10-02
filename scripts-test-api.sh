#!/bin/bash
# Test curl des chantiers 4-b : catégories admin, fidélité, paiements.
# Doit être lancé via scripts-devtest.sh (serveur + tests dans la même session).
B=http://localhost:3000
ADMIN_JAR=/tmp/mc-admin.jar
CUST_JAR=/tmp/mc-cust.jar
rm -f $ADMIN_JAR $CUST_JAR

echo "=========== RESET DONNÉES DE TEST ==========="
cd /home/z/my-project
bun -e "
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
// Comptes de test (cascades : loyalty, sessions)
await db.user.deleteMany({ where: { email: { in: ['client-4b@test.ci', 'admin-4b-test@mignoncite.ci'] } } })
// Catégories de test résiduelles
await db.category.deleteMany({ where: { slug: { in: ['telephonie-test-4b', 'audio-hifi'] } } })
// Paiement mobile money remis à l'état désactivé (test C2)
await db.setting.upsert({ where: { key: 'paymentMobileMoneyEnabled' }, update: { value: '0' }, create: { key: 'paymentMobileMoneyEnabled', value: '0' } })
await db.setting.upsert({ where: { key: 'paymentMobileMoneyNumber' }, update: { value: '' }, create: { key: 'paymentMobileMoneyNumber', value: '' } })
await db.setting.upsert({ where: { key: 'paymentInstructions' }, update: { value: '' }, create: { key: 'paymentInstructions', value: '' } })
await db.\$disconnect()
console.log('reset ok')
"
cd - >/dev/null

jget() { python3 -c "
import sys, json
d = json.load(sys.stdin)
try:
    print(eval(sys.argv[1], {'d': d}))
except Exception as e:
    print('EVAL_ERROR', e)
" "$2"; }

echo "=========== A. CATEGORIES ADMIN ==========="
echo "-- A1. POST sans session -> 401"
curl -s -o /dev/null -w "%{http_code}\n" -X POST $B/api/admin/categories -H 'Content-Type: application/json' -d '{"name":"Test"}'

echo "-- A2. Admin claim (premiers identifiants = admin si aucun admin)"
CLAIM=$(curl -s -c $ADMIN_JAR -X POST $B/api/auth/admin-claim -H 'Content-Type: application/json' -d '{"email":"admin-4b-test@mignoncite.ci","password":"Admin4bTest!","name":"Admin 4b"}')
echo "$CLAIM" | head -c 200; echo

if ! echo "$CLAIM" | grep -q '"ok"'; then
  echo "-- fallback : promotion directe en base + login"
  cd /home/z/my-project
  bun -e "
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
const db = new PrismaClient()
const email = 'admin-4b-test@mignoncite.ci'
const passwordHash = await hash('Admin4bTest!', 10)
const existing = await db.user.findUnique({ where: { email } })
if (existing) await db.user.update({ where: { email }, data: { role: 'admin', password: passwordHash } })
else await db.user.create({ data: { email, name: 'Admin 4b', role: 'admin', password: passwordHash } })
await db.\$disconnect()
console.log('promoted')
"
  cd - >/dev/null
  curl -s -c $ADMIN_JAR -X POST $B/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin-4b-test@mignoncite.ci","password":"Admin4bTest!"}' | head -c 150; echo
fi

echo "-- A3. GET admin categories"
curl -s -b $ADMIN_JAR $B/api/admin/categories | head -c 250; echo

echo "-- A4. POST catégorie accentuée (slug auto attendu: telephonie-test-4b)"
CAT=$(curl -s -b $ADMIN_JAR -X POST $B/api/admin/categories -H 'Content-Type: application/json' -d '{"name":"Téléphonie Test 4b","description":"Catégorie de test 4b","order":90}')
echo "$CAT" | head -c 300; echo
CAT_ID=$(echo "$CAT" | jget x 'd["category"]["id"]' 2>/dev/null)
echo "   -> id=$CAT_ID"

echo "-- A5. POST doublon (même nom) -> 409 attendu"
curl -s -w "|%{http_code}\n" -b $ADMIN_JAR -X POST $B/api/admin/categories -H 'Content-Type: application/json' -d '{"name":"Téléphonie Test 4b"}' | head -c 300

echo "-- A6. PATCH renommage (re-slug attendu: audio-hifi)"
curl -s -b $ADMIN_JAR -X PATCH $B/api/admin/categories -H 'Content-Type: application/json' -d "{\"id\":\"$CAT_ID\",\"name\":\"Audio Hifi\"}" | head -c 250; echo

echo "-- A7. PATCH slug pris -> 409 attendu (slug 'mode')"
curl -s -w "|%{http_code}\n" -b $ADMIN_JAR -X PATCH $B/api/admin/categories -H 'Content-Type: application/json' -d "{\"id\":\"$CAT_ID\",\"slug\":\"mode\"}" | head -c 250

echo "-- A8. DELETE catégorie avec produits actifs -> 409 attendu"
MODE_ID=$(curl -s $B/api/categories | jget x '[c for c in d if c["slug"]=="mode"][0]["id"]')
echo "   (mode id=$MODE_ID)"
curl -s -w "|%{http_code}\n" -b $ADMIN_JAR -X DELETE $B/api/admin/categories -H 'Content-Type: application/json' -d "{\"id\":\"$MODE_ID\"}" | head -c 400

echo "-- A9. DELETE catégorie sans produits -> 200 attendu"
curl -s -w "|%{http_code}\n" -b $ADMIN_JAR -X DELETE $B/api/admin/categories -H 'Content-Type: application/json' -d "{\"id\":\"$CAT_ID\"}"

echo "=========== B. FIDELITE ==========="
echo "-- B1. GET /api/loyalty sans session -> 401"
curl -s -o /dev/null -w "%{http_code}\n" $B/api/loyalty

echo "-- B2. Inscription client"
curl -s -c $CUST_JAR -X POST $B/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Client 4b","email":"client-4b@test.ci","password":"Client4b!"}' | head -c 200; echo

echo "-- B3. GET /api/loyalty connecté (compte créé à la volée, 0 points)"
curl -s -b $CUST_JAR $B/api/loyalty | head -c 300; echo

echo "-- B4. Produit EN STOCK pour la commande"
PROD=$(curl -s $B/api/products | jget x '[p for p in d if p["stock"]>0][0]["id"]')
echo "   product=$PROD"

echo "-- B5. Commande mobile_money (connecté) -> fidélité créditée"
ORDER=$(curl -s -b $CUST_JAR -X POST $B/api/orders -H 'Content-Type: application/json' -d "{
  \"email\":\"client-4b@test.ci\",
  \"customerName\":\"Client 4b\",
  \"items\":[{\"productId\":\"$PROD\",\"quantity\":1}],
  \"shippingMethod\":\"standard\",
  \"paymentMethod\":\"mobile_money\",
  \"address\":{\"line1\":\"12 rue du Test\",\"line2\":\"\",\"postalCode\":\"00225\",\"city\":\"Abidjan\",\"country\":\"Côte d'Ivoire\"}
}")
echo "$ORDER" | head -c 300; echo
TOTAL=$(echo "$ORDER" | jget x 'd.get("total", 0)')
echo "   total=$TOTAL (points attendus: $((TOTAL / 100)))"

echo "-- B6. GET /api/loyalty après commande"
curl -s -b $CUST_JAR $B/api/loyalty | python3 -c "
import sys, json
d = json.load(sys.stdin)
a = d['account']
print('points:', a['points'], '| lifetime:', a['lifetimePoints'], '| tier:', a['tier'], '| tx:', len(d['transactions']), '| next:', (d['nextTier'] or {}).get('tier'))
if d['transactions']:
    t = d['transactions'][0]
    print('tx[0]:', t['type'], t['points'], t['reason'])
"

echo "=========== C. PAIEMENTS ==========="
echo "-- C1. initiate sans session -> 401"
ORDER_ID=$(curl -s -b $CUST_JAR $B/api/account/orders | jget x 'd["orders"][0]["id"]')
curl -s -o /dev/null -w "%{http_code}\n" -X POST $B/api/payments/initiate -H 'Content-Type: application/json' -d "{\"orderId\":\"$ORDER_ID\",\"provider\":\"mobile_money_wave\"}"

echo "-- C2. initiate MM désactivé -> 503 attendu"
curl -s -w "|%{http_code}\n" -b $CUST_JAR -X POST $B/api/payments/initiate -H 'Content-Type: application/json' -d "{\"orderId\":\"$ORDER_ID\",\"provider\":\"mobile_money_wave\"}" | head -c 250

echo "-- C3. Admin active MM + numéro + instructions"
curl -s -b $ADMIN_JAR -X PATCH $B/api/admin/settings -H 'Content-Type: application/json' -d '{"paymentMobileMoneyEnabled":true,"paymentMobileMoneyNumber":"+225 07 00 00 00 00","paymentInstructions":"Réglez via Wave au numéro indiqué puis envoyez la référence commande par WhatsApp."}' | head -c 350; echo

echo "-- C4. GET /api/settings public -> bloc payment"
curl -s $B/api/settings | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('payment:', d.get('payment'))
"

echo "-- C5. initiate MM activé -> 200 pending"
PAY=$(curl -s -b $CUST_JAR -X POST $B/api/payments/initiate -H 'Content-Type: application/json' -d "{\"orderId\":\"$ORDER_ID\",\"provider\":\"mobile_money_wave\",\"phoneNumber\":\"+225 01 02 03 04 05\"}")
echo "$PAY" | head -c 400; echo
PAY_ID=$(echo "$PAY" | jget x 'd["transactionId"]')
PAY_REF=$(echo "$PAY" | jget x 'd["reference"]')

echo "-- C6. GET /api/payments/$PAY_ID (propriétaire)"
curl -s -b $CUST_JAR $B/api/payments/$PAY_ID | head -c 350; echo

echo "-- C7. GET /api/payments/$PAY_ID (admin)"
curl -s -b $ADMIN_JAR $B/api/payments/$PAY_REF | head -c 200; echo

echo "-- C8. webhook SANS secret env -> 503 attendu (test via server sans env plus bas)"
echo "(vérifié séparément)"

echo "-- C9. webhook mauvais secret -> 401 attendu"
curl -s -w "|%{http_code}\n" -X POST $B/api/payments/webhook -H 'Content-Type: application/json' -H 'x-webhook-secret: mauvais' -d "{\"reference\":\"$PAY_REF\",\"status\":\"success\"}" | head -c 200

echo "-- C10. webhook bon secret success -> commande payée"
curl -s -X POST $B/api/payments/webhook -H 'Content-Type: application/json' -H "x-webhook-secret: $PAYMENT_WEBHOOK_SECRET" -d "{\"reference\":\"$PAY_REF\",\"status\":\"success\",\"providerTxId\":\"WV-TEST-123\"}" | head -c 250; echo

echo "-- C11. webhook idempotent (2e appel)"
curl -s -X POST $B/api/payments/webhook -H 'Content-Type: application/json' -H "x-webhook-secret: $PAYMENT_WEBHOOK_SECRET" -d "{\"reference\":\"$PAY_REF\",\"status\":\"success\"}" | head -c 250; echo

echo "-- C12. commande après webhook (paymentStatus attendu paid)"
curl -s -b $CUST_JAR $B/api/account/orders | python3 -c "
import sys, json
d = json.load(sys.stdin)
o = d['orders'][0]
print('ref:', o['reference'], '| status:', o['status'], '| paymentStatus:', o['paymentStatus'], '| paymentMethod:', o.get('paymentMethod'))
"

echo "=========== TERMINÉ ==========="
