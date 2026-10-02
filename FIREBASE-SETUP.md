# MignonciteShop — Configuration Firebase (OBLIGATOIRE avant mise en ligne)

Le projet utilise **UN SEUL backend : Firebase**, sur le **forfait Spark
(gratuit)** — sans carte bancaire, sans forfait Blaze, sans facturation :

- **Authentication** : email/password + Google
- **Cloud Firestore** : toute la base (users, products, categories, orders,
  favorites, settings, loyalty, paymentTransactions, emailLogs, …)

**Firebase Storage est volontairement NON utilisé.** Les images produits et
catégories sont des **URLs publiques** stockées dans Firestore
(`products.image`, `categories.image`) — renseignées et prévisualisables
depuis le formulaire admin. Aucun fichier n'est uploadé, aucun Cloud
Function, aucune extension : rien ne peut déclencher de facturation.

La configuration Web est déjà intégrée dans `src/lib/firebase.ts` — mais
certaines activations doivent être faites **une seule fois** depuis la
console Firebase (aucune étape n'est possible depuis le code : c'est une
question de compte Google).

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
firebase deploy --only firestore:rules
```
(`firebase.json` et `firestore.rules` sont à la racine. Aucune règle
Storage : le service n'est pas utilisé.)

**Option B — Console** : copier-coller le contenu de `firestore.rules` dans
Firestore → **Rules** → Publish.

---

## 3. Activer les méthodes de connexion

Console → **Build → Authentication → Sign-in method** :

- **Email/Password** → Enable (nécessaire pour tous les comptes + l'admin).
- **Google** → Enable (bouton « Continuer avec Google »).
- **Ne pas activer** Téléphone/SMS (payant à l'usage et non utilisé).

## 4. Autoriser le domaine de la boutique

Console → **Authentication → Settings → Authorized domains** :

- Ajouter le domaine de prévisualisation utilisé (ex. `xxxx.preview.z.ai`)
  et le domaine de production final.
- Sans cela, la connexion Google affiche `auth/unauthorized-domain`.
  (Email/mot de passe fonctionne sans cette étape.)

## 5. Images des produits (au lieu de Firebase Storage)

1. Héberger l'image où vous voulez en public (Google Photos lien direct,
   Imgur, votre CDN, GitHub, …) — ou garder les images statiques déjà
   présentes dans `public/images/…`.
2. Copier l'URL complète (`https://…`).
3. Administration → Produits (ou Catégories) → champ **Image (URL
   publique)** : coller l'URL → l'aperçu s'affiche → Enregistrer.
4. Le bouton **« Supprimer l'image »** retire l'URL du produit.

---

## Premier administrateur (geste caché intégré)

1. Ouvrir la page **Connexion** de la boutique.
2. **Cliquer 7 fois rapidement sur « MIGNONCITESHOP »** (délai < 3 s).
3. Une fenêtre « Espace réservé — Administration » s'ouvre : saisir l'email +
   mot de passe choisis → **Enregistrer et se connecter**.
4. Ces identifiants deviennent le compte admin (Firestore `users/{uid}`
   `role: "admin"` + `settings/public.adminExists = true` verrouille ensuite
   toute nouvelle création d'admin).
5. Dans **Administration → Tableau de bord**, cliquer **« Initialiser la
   boutique »** pour créer les catégories de référence (Vêtements, Chaussures,
   Sacs, Accessoires, Mode Homme, Mode Femme), les codes promo et les
   réglages de livraison FCFA.

---

## Quotas forfait Spark (gratuit) et bonnes pratiques intégrées

| Ressource | Quota Spark | Maîtrise dans le code |
|---|---|---|
| Firestore lectures | 50 000/jour | Cache mémoire + sessionStorage des réglages/promos ; listeners temps réel limités au strict nécessaire (catalogue actif, panier) |
| Firestore écritures | 20 000/jour | Transaction unique par commande ; journalisation minimale |
| Firestore stockage | 1 GiB | Images = URLs (quelques octets) ; aucun binaire dans Firestore |
| Auth | 50 000 MAU | — |
| Sortie egress | 10 GiB/mois | Images servies depuis l'URL externe, pas depuis Firebase |

## Limitations connues (honnêteté d'ingénieur)

| Point | État | Mitigation actuelle | Solution complète (nécessiterait Blaze) |
|---|---|---|---|
| Intégrité des prix de commande | ⚠️ | Les totaux sont recalculés depuis les **prix Firestore** (transaction), jamais depuis le panier local ; l'admin valide chaque commande avant expédition | Cloud Function `createOrder` (Admin SDK) |
| Points de fidélité | ⚠️ | Écrits par le client lors de la commande ; piste d'audit immuable ; l'admin peut ajuster | Cloud Function déclenchée sur `orders` |
| E-mails transactionnels | ⚠️ | Journalisés dans `emailLogs` (consultables dans l'admin) ; reset password géré nativement par Firebase Auth | Extension « Trigger Email » + SendGrid |
| Webhook mobile money | ⚠️ | `paymentTransactions` créé en `pending` ; **confirmation manuelle par l'admin** (statut Payée) — aucun webhook automatique n'est simulé | Webhook Wave/Orange → Cloud Function |
| Bootstrap premier admin | ⚠️ | Théoriquement, la première personne à faire le geste 7 taps après l'installation devient admin — faites-le immédiatement | Custom claims via Admin SDK |

Aucune de ces limitations n'est visible pour un client normal ; elles
nécessiteraient une fonction serveur (forfait Blaze) pour être supprimées —
le projet fonctionne volontairement sans, conformément au forfait Spark.
