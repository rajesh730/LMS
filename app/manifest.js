export default function manifest() {
  return {
    name: "Pravyo",
    short_name: "Pravyo",
    description:
      "School events, results, magazines, certificates, notices, and student writing in one connected platform.",
    // A stable id keeps an already-installed app updating in place rather than
    // being treated as a new app if start_url ever changes.
    id: "/",
    start_url: "/",
    // Everything under the origin is in-app. Without an explicit scope a link
    // outside it opens in a browser window, which breaks the illusion mid-flow.
    scope: "/",
    display: "standalone",
    // Preference order, not a single choice: a browser that cannot do
    // standalone falls back to minimal-ui (a slim, still app-like chrome)
    // instead of dropping all the way to a normal tab.
    display_override: ["standalone", "minimal-ui"],
    lang: "en",
    dir: "ltr",
    categories: ["education"],
    // White splash background so the navy logo mark stays visible (on a navy
    // background the logo nearly vanished, leaving ghosted "traces").
    background_color: "#ffffff",
    theme_color: "#071833",
    icons: [
      // A "maskable" icon is cropped to the platform's shape (circle, squircle,
      // rounded square). Listing the same file as both `any` and `maskable` is
      // a common mistake: Android then crops the plain icon and clips the mark.
      // Split entries let each platform pick the right one.
      {
        src: "/pravyo-icon.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pravyo-icon.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png?v=2",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
