export default function manifest() {
  return {
    name: "Pratyo",
    short_name: "Pratyo",
    description:
      "School events, results, showcases, certificates, notices, and student challenges in one connected platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#071833",
    theme_color: "#071833",
    icons: [
      {
        src: "/pratyo-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pratyo-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
