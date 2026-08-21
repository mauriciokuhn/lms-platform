import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ponto-do-saber.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cursos", "/login", "/register"],
        disallow: ["/admin/", "/api/", "/dashboard/", "/_next/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
