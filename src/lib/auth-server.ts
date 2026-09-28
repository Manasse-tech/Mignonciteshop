/**
 * Aides serveur d'authentification — sessions cookie httpOnly + bcrypt.
 *
 * Choix d'architecture : sessions persistées en base (model Session du
 * schéma NextAuth) plutôt que JWT — révocables immédiatement (logout,
 * bannissement) et sans dépendance externe.
 */

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "mc_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Crée une session en base et renvoie le token à poser en cookie. */
export async function createSession(userId: string): Promise<{
  token: string;
  expires: Date;
}> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { sessionToken: token, userId, expires } });
  return { token, expires };
}

/** Pose le cookie de session sur une réponse (httpOnly, sameSite lax). */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  expires: Date
): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

/** Supprime le cookie de session d'une réponse. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Renvoie l'utilisateur connecté à partir du cookie de session,
 * ou null (session absente / expirée / révoquée).
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expires.getTime() <= Date.now()) {
    // Session expirée : nettoyage opportuniste.
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

/** Variante pour routes API : lit le cookie depuis la requête entrante. */
export async function getSessionUserFromRequest(
  request: Request
): Promise<AuthUser | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = match?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || session.expires.getTime() <= Date.now()) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

/**
 * Garde admin : renvoie l'utilisateur si role === "admin", sinon null.
 * Toute route /api/admin/* doit l'appeler en première instruction.
 */
export async function requireAdmin(
  request: Request
): Promise<AuthUser | null> {
  const user = await getSessionUserFromRequest(request);
  return user && user.role === "admin" ? user : null;
}

/** Réponse 401 standard pour les routes protégées. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Accès non autorisé." },
    { status: 401 }
  );
}
