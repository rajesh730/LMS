export default function manifest() {
  return {
    name: "Pravyo",
    short_name: "Pravyo",
    description:
      "School events, results, magazines, certificates, notices, and student writing in one connected platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#071833",
    theme_color: "#071833",
    icons: [
      {
        src: "/pravyo-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
