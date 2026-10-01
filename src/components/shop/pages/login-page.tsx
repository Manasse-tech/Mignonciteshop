"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/auth-store";
import {
  LoginReturnNotice,
  consumeAfterLogin,
} from "@/components/shop/require-auth";

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required = true,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="h-11 rounded-xl pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {visible ? (
          <EyeOff className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Eye className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { setUser } = useAuthStore();
  const router = useRouter();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Geste secret : 7 taps sur le nom de la boutique → connexion admin ──
  const tapCount = useRef(0);
  const tapTimer = useRef<number | null>(null);
  const [adminSecretOpen, setAdminSecretOpen] = useState(false);
  const [adminFirstTime, setAdminFirstTime] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const handleSecretTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    // Série invalidée après 3 s d'inactivité — evite les taps fortuits.
    tapTimer.current = window.setTimeout(() => {
      tapCount.current = 0;
    }, 3000);
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      setAdminEmail("");
      setAdminPassword("");
      // Détermine le mode du formulaire caché : enregistrement (aucun admin
      // défini → les premiers identifiants deviennent le compte admin) ou
      // connexion (un admin existe déjà).
      fetch("/api/auth/admin-claim")
        .then((r) => (r.ok ? r.json() : { adminExists: false }))
        .then(
          (data: { adminExists?: boolean } | null) =>
            setAdminFirstTime(!data?.adminExists)
        )
        .catch(() => setAdminFirstTime(false));
      setAdminSecretOpen(true);
    }
  };

  const handleAdminSecretSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (adminSubmitting) return;
    setAdminSubmitting(true);
    try {
      const response = await fetch("/api/auth/admin-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        created?: boolean;
        user?: AuthUser;
      } | null;
      if (!response.ok || !data?.ok || !data.user) {
        throw new Error(data?.error ?? "Accès administrateur impossible.");
      }
      setUser(data.user);
      setAdminSecretOpen(false);
      toast.success(
        data.created
          ? "Compte administrateur enregistré. Bienvenue !"
          : "Connexion administrateur réussie."
      );
      onNavigate("admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Accès impossible.");
    } finally {
      setAdminSubmitting(false);
    }
  };
  // ── Fin geste secret ──

  // Réinitialisation de mot de passe — flux « mot de passe oublié ».
  // Le lien e-mail (?reset=<token>) ouvre directement le formulaire.
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetDone, setResetDone] = useState(false);

  // Session déjà active ? → évite de re-saisir ses identifiants.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
    // Token de reset passé dans l'URL par l'e-mail de réinitialisation.
    const token = new URLSearchParams(window.location.search).get("reset");
    if (token && token.length >= 10) {
      setResetToken(token);
    }
  }, []);

  const redirectAfterLogin = (user: AuthUser) => {
    // Retour automatique sur la page protégée demandée avant redirection
    // (panier, favoris…) si elle a été mémorisée.
    const after = consumeAfterLogin();
    if (after) {
      const qs = after.startsWith("?") ? after.slice(1) : after.replace(/^\//, "");
      router.push(qs ? `/?${qs}` : "/");
      return;
    }
    // L'admin est redirigé vers son espace de gestion.
    onNavigate(user.role === "admin" ? "admin" : "account");
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        user?: AuthUser;
      } | null;
      if (!response.ok || !data?.ok || !data.user) {
        throw new Error(data?.error ?? "Connexion impossible.");
      }
      setUser(data.user);
      toast.success(`Connexion réussie. Bienvenue ${data.user.name ?? ""} !`);
      redirectAfterLogin(data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (registerPassword !== registerConfirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (registerPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        user?: AuthUser;
      } | null;
      if (!response.ok || !data?.ok || !data.user) {
        throw new Error(data?.error ?? "Inscription impossible.");
      }
      setUser(data.user);
      toast.success("Compte créé. Bienvenue chez MignonciteShop !");
      redirectAfterLogin(data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inscription impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  // Demande de réinitialisation — réponse toujours positive côté serveur
  // (anti-énumération) : le message reste volontairement générique.
  const handleForgot = async () => {
    if (forgotSending) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }
    setForgotSending(true);
    try {
      const result = await api.auth.forgotPassword(forgotEmail.trim());
      setForgotOpen(false);
      toast.success(result.message, {
        description:
          "En démonstration, consultez l'onglet E-mails de l'admin pour voir le lien envoyé.",
      });
      setForgotEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demande impossible.");
    } finally {
      setForgotSending(false);
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetToken || submitting) return;
    if (resetPassword !== resetConfirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (resetPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.auth.resetPassword(resetToken, resetPassword);
      setResetDone(true);
      toast.success(result.message);
      setResetToken(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réinitialisation impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Écran de réinitialisation (ouvert depuis l'e-mail) ----
  if (resetToken) {
    return (
      <div className="bg-background flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col w-full">
          <div className="flex-1 flex items-center justify-center py-16 px-4">
            <div className="w-full max-w-md bg-card rounded-2xl border shadow-sm p-8">
              <div className="text-center mb-6">
                <div className="rounded-full bg-[#C9A961]/10 p-4 w-fit mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-[#C9A961]" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  Nouveau mot de passe
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Choisissez un mot de passe solide pour sécuriser votre compte.
                </p>
              </div>

              {resetDone ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Votre mot de passe a été mis à jour. Vous pouvez dès
                    maintenant vous connecter.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("login")}
                    className="w-full bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full py-3 font-semibold transition-colors"
                  >
                    Me connecter
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-password">Nouveau mot de passe</Label>
                    <PasswordInput
                      id="reset-password"
                      value={resetPassword}
                      onChange={setResetPassword}
                      placeholder="Au moins 6 caractères"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm">
                      Confirmer le mot de passe
                    </Label>
                    <PasswordInput
                      id="reset-confirm"
                      value={resetConfirm}
                      onChange={setResetConfirm}
                      placeholder="Ressaisissez votre mot de passe"
                      autoComplete="new-password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full py-3 font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {submitting ? "Enregistrement..." : "Mettre à jour mon mot de passe"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex-1 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col w-full">
        <div className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-md bg-card rounded-2xl border shadow-sm p-8">
            <div className="text-center mb-2">
              {/* Geste secret : 7 taps rapides sur le nom de la boutique
                  ouvrent la page de connexion administrateur réservée. */}
              <button
                type="button"
                onClick={handleSecretTap}
                aria-label="MignonciteShop"
                className="mx-auto block cursor-default select-none"
              >
                <span className="text-2xl font-bold tracking-tight logo-glow">
                  <span className="text-foreground">MIGNONCITE</span>
                  <span className="text-[#C9A961]">SHOP</span>
                </span>
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Connectez-vous pour suivre vos commandes et gérer votre compte
            </p>

            <LoginReturnNotice />

            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
              </TabsList>

              {/* Connexion */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      required
                      autoComplete="email"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <PasswordInput
                      id="login-password"
                      value={loginPassword}
                      onChange={setLoginPassword}
                      placeholder="Votre mot de passe"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-sm text-[#C9A961] hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full py-3 font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {submitting ? "Connexion..." : "Se connecter"}
                  </button>
                </form>
              </TabsContent>

              {/* Inscription */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nom</Label>
                    <Input
                      id="register-name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Votre nom complet"
                      required
                      autoComplete="name"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      required
                      autoComplete="email"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <PasswordInput
                      id="register-password"
                      value={registerPassword}
                      onChange={setRegisterPassword}
                      placeholder="Au moins 6 caractères"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">
                      Confirmer le mot de passe
                    </Label>
                    <PasswordInput
                      id="register-confirm"
                      value={registerConfirm}
                      onChange={setRegisterConfirm}
                      placeholder="Ressaisissez votre mot de passe"
                      autoComplete="new-password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full py-3 font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {submitting ? "Création..." : "Créer mon compte"}
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialog — mot de passe oublié */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mot de passe oublié</DialogTitle>
            <DialogDescription>
              Saisissez l&apos;adresse email de votre compte : vous recevrez un
              lien de réinitialisation valable 1 heure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="vous@exemple.com"
              autoComplete="email"
              className="h-11 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleForgot}
              disabled={forgotSending}
              className="bg-[#C9A961] hover:bg-[#b8994f] text-white"
            >
              {forgotSending ? "Envoi..." : "Envoyer le lien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — connexion administrateur CACHÉE (7 taps sur le logo) */}
      <Dialog open={adminSecretOpen} onOpenChange={setAdminSecretOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#C9A961]" aria-hidden="true" />
              Espace réservé — Administration
            </DialogTitle>
            <DialogDescription>
              {adminFirstTime
                ? "Aucun administrateur n'est encore défini : les identifiants saisis ci-dessous seront ENREGISTRÉS comme compte administrateur."
                : "Saisissez les identifiants administrateur de la boutique."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdminSecretSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-secret-email">Email administrateur</Label>
              <Input
                id="admin-secret-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@votre-boutique.com"
                required
                autoComplete="email"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-secret-password">Mot de passe</Label>
              <PasswordInput
                id="admin-secret-password"
                value={adminPassword}
                onChange={setAdminPassword}
                placeholder={adminFirstTime ? "Au moins 8 caractères (lettre + chiffre)" : "Votre mot de passe"}
                autoComplete="current-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdminSecretOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={adminSubmitting}
                className="bg-[#C9A961] hover:bg-[#b8994f] text-white"
              >
                {adminSubmitting
                  ? "Vérification..."
                  : adminFirstTime
                    ? "Enregistrer et se connecter"
                    : "Se connecter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
