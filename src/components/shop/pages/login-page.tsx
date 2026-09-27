"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore, type AuthUser } from "@/lib/auth-store";

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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Session déjà active ? → évite de re-saisir ses identifiants.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  const redirectAfterLogin = (user: AuthUser) => {
    // L'admin est redirigé vers son espace de gestion.
    onNavigate(user.role === "admin" ? "admin" : "home");
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

  const handleForgotPassword = () => {
    toast.info("Cette fonctionnalité arrive bientôt !");
  };

  return (
    <div className="bg-background flex-1 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col w-full">
        <div className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-md bg-card rounded-2xl border shadow-sm p-8">
            <div className="text-center mb-2">
              <span className="text-2xl font-bold tracking-tight logo-glow">
                <span className="text-foreground">MIGNONCITE</span>
                <span className="text-[#C9A961]">SHOP</span>
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Connectez-vous pour accéder à votre panier et vos commandes
            </p>

            <div className="mb-5 rounded-xl border border-[#C9A961]/30 bg-[#C9A961]/5 px-4 py-3 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#C9A961] mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">
                Espace de démonstration — administrateur :
                <span className="block font-mono text-foreground mt-1 break-all">
                  admin@mignonciteshop.fr · Admin1234!
                </span>
                Client (avec historique de commandes) :
                <span className="block font-mono text-foreground mt-1 break-all">
                  marie@test.fr · Client1234!
                </span>
              </p>
            </div>

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
                      onClick={handleForgotPassword}
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
    </div>
  );
}
