const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.infobytesnepal.com";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/events", "/schools", "/notices"],
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
