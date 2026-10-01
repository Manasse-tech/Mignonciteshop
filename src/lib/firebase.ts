"use client";

/**
 * Firebase — UNIQUE backend de MignonciteShop.
 *
 * Architecture finale (aucun autre backend) :
 *   Frontend → Firebase Authentication
 *            → Cloud Firestore
 *            → Firebase Storage
 *
 * La configuration Web ci-dessous est PUBLIQUE par conception (elle identifie
 * le projet Firebase, elle n'est pas un secret) — voir
 * https://firebase.google.com/docs/projects/api-keys
 * Les vraies protections sont les Security Rules (firestore.rules /
 * storage.rules) — jamais côté client.
 *
 * NE JAMAIS placer ici : service account JSON, clé privée Admin SDK,
 * identifiants Cloud Functions (cf. FIREBASE-SETUP.md).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyBU6iyEA3gHKXWPt65iAMSrug1ziqj6di4",
  authDomain: "mignoncite-3528e.firebaseapp.com",
  projectId: "mignoncite-3528e",
  storageBucket: "mignoncite-3528e.firebasestorage.app",
  messagingSenderId: "710425593752",
  appId: "1:710425593752:web:ccaf1ff45cfa70136d0ded",
  measurementId: "G-1LSRPQVGH5",
};

/** Singleton App (évite les ré-initialisations sous HMR Next.js). */
function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function fbAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function fbDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

export function fbStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getFirebaseApp());
  return _storage;
}

/**
 * Traduit les codes d'erreur Firebase en messages français compréhensibles
 * pour l'utilisateur (authentification, Firestore, Storage).
 */
export function friendlyFirebaseError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  const AUTH: Record<string, string> = {
    "auth/invalid-email": "Adresse email invalide.",
    "auth/user-disabled": "Ce compte a été désactivé.",
    "auth/user-not-found": "Aucun compte n'existe avec cet email.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Email ou mot de passe incorrect.",
    "auth/email-already-in-use":
      "Un compte existe déjà avec cet email — connectez-vous.",
    "auth/weak-password":
      "Mot de passe trop faible (6 caractères minimum, 8 recommandé).",
    "auth/password-does-not-meet-requirements":
      "Le mot de passe ne respecte pas la politique du projet : au moins 6 caractères dont un caractère spécial (ex : !, ?, #).",
    "auth/too-many-requests":
      "Trop de tentatives. Réessayez dans quelques minutes.",
    "auth/popup-blocked":
      "Le navigateur a bloqué la fenêtre Google. Autorisez les popups ou réessayez.",
    "auth/popup-closed-by-user": "Connexion Google annulée.",
    "auth/cancelled-popup-request": "Connexion Google annulée.",
    "auth/account-exists-with-different-credential":
      "Un compte existe déjà avec cet email via une autre méthode (mot de passe). Connectez-vous d'abord avec votre mot de passe.",
    "auth/network-request-failed":
      "Réseau indisponible — vérifiez votre connexion internet.",
    "auth/operation-not-allowed":
      "Méthode de connexion non activée sur le projet Firebase (console → Authentication → Sign-in method).",
    "auth/unauthorized-domain":
      "Domaine non autorisé : ajoutez ce domaine dans Firebase Console → Authentication → Settings → Authorized domains.",
    "auth/requires-recent-login":
      "Veuillez vous reconnecter pour confirmer cette action sensible.",
    "auth/admin-restricted-operation":
      "Action réservée à l'administrateur du projet Firebase.",
  };

  if (AUTH[code]) return AUTH[code];

  if (code === "permission-denied" || code === "storage/unauthorized") {
    return "Permission refusée par les règles de sécurité Firebase.";
  }
  if (code === "unavailable") {
    return "Service Firebase momentanément indisponible — réessayez.";
  }
  if (code === "failed-precondition") {
    return "Opération impossible : la base Firestore du projet n'est pas encore créée (voir FIREBASE-SETUP.md).";
  }
  if (code.startsWith("storage/")) {
    return "Transfert de l'image impossible (taille max 2 Mo, format image).";
  }

  const message =
    error instanceof Error && error.message ? error.message : "Erreur inconnue.";
  return message;
}
