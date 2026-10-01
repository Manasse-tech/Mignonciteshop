# MignonciteShop — Configuration Firebase (OBLIGATOIRE avant mise en ligne)

Le projet utilise **UN SEUL backend : Firebase** (Authentication + Cloud
Firestore + Storage). La configuration Web est déjà intégrée dans
`src/lib/firebase.ts` — mais certaines activations doivent être faites **une
seule fois** depuis la console Firebase (aucune étape n'est possible depuis le
code : c'est une question de compte Google).

Projet : `mignoncite-3528e` — https://console.firebase.google.com/project/mignoncite-3528e

---

## 1. Créer la base Firestore (BLOQUANT — l'API est actuellement désactivée)

> Vérification effectuée : `Cloud Firestore API has not been used in project
> mignoncite-3528e before or it is disabled.`

1. Console → **Build → Firestore Database** → **Create database**.
2. Choisir **Production mode** (les règles ci-dessous prennent le relais).
3. Région conseillée : `europe-west1` (ou `europe-west3`) — la Côte d'Ivoire
   n'a pas de région Firestore.
4. Créer ensuite la collection `settings` avec un document `public`
   (Firestore → Start collection) :
   - `settings/public` → champ `adminExists` (boolean) = `false`

---

## 2. Déployer les règles de sécurité

Deux options :

**Option A — CLI (recommandé)** :
```bash
npm i -g firebase-tools
firebase login
firebase use mignoncite-3528e
firebase deploy --only firestore:rules,storage
```
(`firebase.json`, `firestore.rules` et `storage.rules` sont à la racine.)

**Option B — Console** : copier-coller le contenu de `firestore.rules` dans
Firestore → **Rules**, et `storage.rules` dans Storage → **Rules** → Publish.

---

## 3. Activer les méthodes de connexion

Console → **Build → Authentication → Sign-in method** :

- **Email/Password** → Enable (nécéssaire pour tous les comptes + l'admin).
- **Google** → Enable (bouton « Continuer avec Google »).

## 4. Autoriser le domaine de la boutique

Console → **Authentication → Settings → Authorized domains** :

- Ajouter le domaine de prévisualisation utilisé (ex. `xxxx.preview.z.ai`)
  et le domaine de production final.
- Sans cela, la connexion Google affiche `auth/unauthorized-domain`.
  (Email/mot de passe fonctionne sans cette étape.)

## 5. Activer Firebase Storage

Console → **Build → Storage** → **Get started** (bucket
`mignoncite-3528e.firebasestorage.app`). Vérification effectuée : le bucket
répond 404 tant qu'il n'a pas été provisionné ici. Publier `storage.rules`.

---

## 6. Premier administrateur (geste caché intégré)

1. Ouvrir la page **Connexion** de la boutique.
2. **Cliquer 7 fois rapidement sur « MIGNONCITESHOP »** (délai < 3 s).
3. Une fenêtre « Espace réservé — Administration » s'ouvre : saisir l'email +
   mot de passe choisis → **Enregistrer et se connecter**.
4. Ces identifiants deviennent le compte admin (Firestore `users/{uid}`
   `role: "admin"` + `settings/public.adminExists = true` verrouille ensuite
   toute nouvelle création d'admin).
5. Dans **Administration → Tableau de bord**, cliquer **« Initialiser la
   boutique »** pour créer les catégories de référence (Vêtements, Chaussures,
   Sacs, Accessoires, Mode Homme, Mode Femme), les codes promo et les réglages
   de livraison FCFA.

---

## Limitations connues (honnêteté d'ingénieur)

| Point | État | Mitigation actuelle | Solution complète |
|---|---|---|---|
| Intégrité des prix de commande | ⚠️ | Les totaux sont recalculés depuis les **prix Firestore** (transaction), jamais depuis le panier local ; l'admin valide chaque commande avant expédition | Cloud Function `createOrder` (Admin SDK) |
| Points de fidélité | ⚠️ | Écrits par le client lors de la commande ; piste d'audit immuable ; l'admin peut ajuster | Cloud Function déclenchée sur `orders` |
| E-mails transactionnels | ⚠️ | Journalisés dans `emailLogs` (consultables dans l'admin) ; reset password géré nativement par Firebase Auth | Extension « Trigger Email » + SendGrid |
| Webhook mobile money | ⚠️ | `paymentTransactions` créé en `pending` ; confirmation manuelle par l'admin (statut Payée) | Webhook Wave/Orange → Cloud Function |
| Upload Storage non-admin | ⚠️ | Tout utilisateur connecté peut téléverser une image (2 Mo max) dans `uploads/` — elle n'est liée à AUCUN produit | Custom claims admin via Admin SDK |
| Bootstrap premier admin | ⚠️ | Théoriquement, la première personne à faire le geste 7 taps après l'installation devient admin — faites-le immédiatement | Custom claims via Admin SDK |

Aucune de ces limitations n'est visible pour un client normal ; elles
nécessitent toutes une fonction serveur (plan Blaze ou extension Firebase)
pour être supprimées.
