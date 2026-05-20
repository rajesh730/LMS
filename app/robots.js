const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.com";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/events", "/schools", "/partners", "/challenges", "/notices"],
      disallow: [
        "/admin/",
        "/school/",
        "/student/",
        "/teacher/",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
