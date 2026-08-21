import { db } from "@/lib/db";

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pontodosaber.vercel.app";

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${baseUrl}/cursos`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${baseUrl}/categorias`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${baseUrl}/instrutores`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${baseUrl}/planos`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${baseUrl}/privacidade`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/termos`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${baseUrl}/esqueci-senha`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${baseUrl}/gamificacao`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.5 },
    { url: `${baseUrl}/certificados`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.5 },
  ];

  // Dynamic course pages
  let courses: { id: string; updatedAt: Date }[] = [];
  try {
    courses = await db.course.findMany({
      where: { published: true },
      select: { id: true, updatedAt: true },
    });
  } catch {
    // DB might not be available during build
  }

  const coursePages = courses.map((course) => ({
    url: `${baseUrl}/cursos/${course.id}`,
    lastModified: course.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic instructor pages
  let instructors: { id: string }[] = [];
  try {
    instructors = await db.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: { id: true },
    });
  } catch {
    // DB might not be available during build
  }

  const instructorPages = instructors.map((instructor) => ({
    url: `${baseUrl}/instrutores/${instructor.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...coursePages, ...instructorPages];
}
