import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/ui/toast-provider";
import { DemoBanner } from "@/components/ui/demo-banner";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pontodosaber.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Ponto do Saber - Aprendizado Online",
    template: "%s | Ponto do Saber",
  },
  description:
    "Plataforma de cursos online com videoaulas, questionários interativos, certificados digitais e acompanhamento de progresso. Aprenda no seu ritmo!",
  keywords: [
    "cursos online",
    "LMS",
    "educação a distância",
    "videoaulas",
    "certificado online",
    "aprendizado online",
    "plataforma de cursos",
  ],
  authors: [{ name: "Ponto do Saber" }],
  creator: "Ponto do Saber",
  publisher: "Ponto do Saber",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Ponto do Saber",
    title: "Ponto do Saber - Aprendizado Online",
    description:
      "Plataforma completa de cursos online com videoaulas, questionários e certificados.",
    url: baseUrl,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ponto do Saber - Aprendizado Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ponto do Saber - Aprendizado Online",
    description:
      "Plataforma completa de cursos online com videoaulas, questionários e certificados.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Ponto do Saber",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased scroll-smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Apply the persisted theme before first paint. ThemeToggle also
            manages the class on pages that mount it, but lesson/quiz/course
            pages have no toggle — without this every page would open light
            regardless of the saved preference. Mirrors readInitialTheme in
            src/components/ui/theme-toggle.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />

        {/* PWA meta tags */}
        <meta name="application-name" content="Ponto do Saber" />
        <meta name="apple-mobile-web-app-title" content="Ponto do Saber" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "Ponto do Saber",
              description:
                "Plataforma de cursos online com videoaulas, questionários e certificados.",
              url: baseUrl,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "BRL",
                availability: "https://schema.org/InStock",
              },
            }),
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans"
      >
        <Providers>
          <DemoBanner />
          {children}
          <ToastProvider />
        </Providers>
      </body>
    </html>
  );
}
