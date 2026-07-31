import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/ui/toast-provider";
import { DemoBanner } from "@/components/ui/demo-banner";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lms-platform.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "LMS Platform - Aprendizado Online",
    template: "%s | LMS Platform",
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
  authors: [{ name: "LMS Platform" }],
  creator: "LMS Platform",
  publisher: "LMS Platform",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "LMS Platform",
    title: "LMS Platform - Aprendizado Online",
    description:
      "Plataforma completa de cursos online com videoaulas, questionários e certificados.",
    url: baseUrl,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LMS Platform - Aprendizado Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LMS Platform - Aprendizado Online",
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
    title: "LMS Platform",
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
        {/* PWA meta tags */}
        <meta name="application-name" content="LMS Platform" />
        <meta name="apple-mobile-web-app-title" content="LMS Platform" />
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
              name: "LMS Platform",
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
