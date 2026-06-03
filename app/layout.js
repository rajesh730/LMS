import './globals.css';
import { Providers } from './providers';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.infobytesnepal.com";

const siteDescription =
  "School events, results, magazines, certificates, notices, and student writing in one connected platform.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pratyo",
    template: "%s | Pratyo",
  },
  description: siteDescription,
  applicationName: "Pratyo",
  keywords: [
    "school events",
    "student writing",
    "school magazine",
    "certificates",
    "talent platform",
    "results and showcases",
  ],
  authors: [{ name: "Pratyo" }],
  creator: "Pratyo",
  publisher: "Pratyo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pratyo",
    description: siteDescription,
    url: siteUrl,
    siteName: "Pratyo",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/pratyo-og.png",
        width: 1200,
        height: 630,
        alt: "Pratyo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pratyo",
    description: siteDescription,
    images: ["/pratyo-og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/pratyo-icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4326e8",
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
