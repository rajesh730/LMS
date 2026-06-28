import './globals.css';
import { Providers } from './providers';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.infobytesnepal.com";

const siteDescription =
  "School events, results, magazines, certificates, notices, and student writing in one connected platform.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pravyo",
    template: "%s | Pravyo",
  },
  description: siteDescription,
  applicationName: "Pravyo",
  keywords: [
    "school events",
    "student writing",
    "school magazine",
    "certificates",
    "talent platform",
    "results and showcases",
  ],
  authors: [{ name: "Pravyo" }],
  creator: "Pravyo",
  publisher: "Pravyo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pravyo",
    description: siteDescription,
    url: siteUrl,
    siteName: "Pravyo",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/pravyo-og.png",
        width: 1200,
        height: 630,
        alt: "Pravyo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pravyo",
    description: siteDescription,
    images: ["/pravyo-og.png"],
  },
  // The `?v=2` query busts aggressively-cached favicons/app icons so browsers
  // and installed PWAs pick up the new logo instead of flashing the old one.
  // Bump this whenever the logo assets change.
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/pravyo-icon.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico?v=2" }],
    apple: [{ url: "/apple-icon.png?v=2", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Navy brand color from the new logo. (Was the old purple #4326e8, which still
  // tinted the mobile address bar / PWA status bar — an "old logo" leftover.)
  themeColor: "#071833",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
