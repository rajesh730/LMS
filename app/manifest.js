export default function manifest() {
  return {
    name: "Pravyo",
    short_name: "Pravyo",
    description:
      "School events, results, magazines, certificates, notices, and student writing in one connected platform.",
    start_url: "/",
    display: "standalone",
    // White splash background so the navy logo mark stays visible (on a navy
    // background the logo nearly vanished, leaving ghosted "traces").
    background_color: "#ffffff",
    theme_color: "#071833",
    icons: [
      {
        src: "/pravyo-icon.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/apple-icon.png?v=2",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
