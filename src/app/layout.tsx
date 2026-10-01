import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shop/theme-provider";
import { IntroSplash } from "@/components/shop/intro-splash";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_URL = "https://www.mignonciteshop.com";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MignonciteShop",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+33-1-23-45-67-89",
    contactType: "customer service",
    availableLanguage: "French",
  },
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MignonciteShop",
  url: SITE_URL,
  inLanguage: "fr-FR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?page=shop&q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MignonciteShop — Boutique en ligne de produits de qualité",
  description:
    "MignonciteShop, votre boutique en ligne premium. Découvrez une sélection de produits de qualité, livraison rapide et paiement sécurisé.",
  applicationName: "MignonciteShop",
  manifest: "/manifest.webmanifest",
  keywords: [
    "boutique en ligne",
    "ecommerce",
    "shopping",
    "mignonciteshop",
    "produits de qualité",
    "livraison rapide",
    "mode femme",
    "accessoires",
    "acheter en ligne",
  ],
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    title: "MignonciteShop — Boutique en ligne de produits de qualité",
    description:
      "MignonciteShop, votre boutique en ligne premium. Découvrez une sélection de produits de qualité, livraison rapide et paiement sécurisé.",
    url: "https://www.mignonciteshop.com",
    siteName: "MignonciteShop",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MignonciteShop — Boutique en ligne premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MignonciteShop — Boutique en ligne de produits de qualité",
    description:
      "MignonciteShop, votre boutique en ligne premium. Découvrez une sélection de produits de qualité, livraison rapide et paiement sécurisé.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C9A961",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground font-sans`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <ThemeProvider>
          <IntroSplash />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
