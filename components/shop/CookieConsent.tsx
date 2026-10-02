'use client'

// ===== Bannière de consentement cookies (RGPD) =====
// Apparait UNIQUEMENT tant que l'utilisateur n'a pas décidé (accepter / refuser /
// personnaliser). Le refus est aussi simple que l'acceptation (exigence CNIL).
// Ré-ouvrable à tout moment via le lien « Gestion des cookies » du footer.

import { useEffect, useState } from 'react'
import { Cookie, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  saveConsent,
  useConsent,
  onReopenCookiePreferences,
  type CookiePreferences,
} from '@/lib/consent'

export default function CookieConsent() {
  const consent = useConsent()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draft, setDraft] = useState<Omit<CookiePreferences, 'necessary'>>({
    analytics: false,
    marketing: false,
  })

  // Lien footer « Gestion des cookies » : ouvre les préférences (bannière visible ou non)
  useEffect(
    () =>
      onReopenCookiePreferences(() => {
        setDraft({
          analytics: consent.preferences?.analytics ?? false,
          marketing: consent.preferences?.marketing ?? false,
        })
        setSettingsOpen(true)
      }),
    [consent.preferences]
  )

  const openSettings = () => {
    setDraft({
      analytics: consent.preferences?.analytics ?? false,
      marketing: consent.preferences?.marketing ?? false,
    })
    setSettingsOpen(true)
  }

  const save = (prefs: Omit<CookiePreferences, 'necessary'>) => {
    saveConsent(prefs)
    setSettingsOpen(false)
  }

  if (consent.decidedAt !== null && !settingsOpen) return null

  const bannerVisible = consent.decidedAt === null

  return (
    <>
      {/* ----- Bannière (première visite uniquement) ----- */}
      {bannerVisible && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Consentement aux cookies"
          className="fixed bottom-0 left-0 right-0 z-[70] animate-fade-up"
        >
          <div className="mx-auto max-w-7xl px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="hidden sm:flex w-10 h-10 rounded-full bg-[#C9A961]/15 items-center justify-center flex-shrink-0">
                    <Cookie className="w-5 h-5 text-[#C9A961]" aria-hidden="true" />
                  </span>
                  <p className="text-sm text-foreground/90 leading-relaxed min-w-0">
                    <span className="font-semibold">Nous respectons votre vie privée. </span>
                    Nous utilisons des cookies pour le fonctionnement du site (panier, session) et,
                    avec votre accord, pour mesurer notre audience et améliorer nos recommandations.
                    Vous pouvez accepter, refuser ou personnaliser vos choix.{' '}
                    <button
                      onClick={openSettings}
                      className="text-[#C9A961] underline underline-offset-2 hover:text-[#b8994f] cursor-pointer"
                    >
                      En savoir plus
                    </button>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => save({ analytics: false, marketing: false })}
                    className="h-11 sm:h-10 px-4 border-border text-foreground hover:bg-muted"
                  >
                    Tout refuser
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openSettings}
                    className="h-11 sm:h-10 px-4 border-border text-foreground hover:bg-muted"
                  >
                    Personnaliser
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => save({ analytics: true, marketing: true })}
                    className="h-11 sm:h-10 px-5 bg-[#C9A961] hover:bg-[#b8994f] text-white"
                  >
                    Tout accepter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----- Panneau de personnalisation ----- */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-[#C9A961]" aria-hidden="true" />
              Gestion des cookies
            </DialogTitle>
            <DialogDescription>
              Choisissez les catégories de cookies que vous autorisez. Votre choix peut être modifié
              à tout moment via le lien « Gestion des cookies » en bas de page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            {/* Nécessaires — toujours actifs */}
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  Cookies nécessaires
                  <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                    Toujours actifs
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Indispensables au fonctionnement : panier, connexion, sécurité, préférences
                  d'affichage. Sans eux, le site ne peut pas fonctionner.
                </p>
              </div>
              <Switch checked disabled aria-label="Cookies nécessaires (toujours actifs)" />
            </div>
            <Separator />

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Mesure d'audience</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Statistiques de visite anonymisées (pages consultées, durée) pour améliorer le
                  site. Jamais partagées avec des tiers à des fins publicitaires.
                </p>
              </div>
              <Switch
                checked={draft.analytics}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
                aria-label="Autoriser la mesure d'audience"
              />
            </div>
            <Separator />

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Marketing &amp; publicité</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Permet de vous proposer des offres et publicités pertinentes, sur ce site ou
                  ailleurs, en fonction de vos centres d'intérêt.
                </p>
              </div>
              <Switch
                checked={draft.marketing}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
                aria-label="Autoriser les cookies marketing"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <ShieldCheck className="w-4 h-4 text-[#C9A961] flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de
              suppression de vos données. Consultez notre page Confidentialité pour en savoir plus.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => save({ analytics: false, marketing: false })}
              className="h-11 sm:h-10 border-border text-foreground hover:bg-muted"
            >
              Tout refuser
            </Button>
            <Button
              onClick={() => save(draft)}
              className="h-11 sm:h-10 bg-[#C9A961] hover:bg-[#b8994f] text-white"
            >
              Enregistrer mes choix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
