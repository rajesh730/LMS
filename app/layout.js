import './globals.css';
import { Providers } from './providers';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pratyo",
    template: "%s | Pratyo",
  },
  description:
    "School events, results, showcases, certificates, notices, and student challenges in one connected platform.",
  applicationName: "Pratyo",
  keywords: [
    "school events",
    "student challenges",
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
    description:
      "School events, results, showcases, certificates, notices, and student challenges in one connected platform.",
    url: siteUrl,
    siteName: "Pratyo",
    type: "website",
    images: [
      {
        url: "/pratyo-logo.png",
        width: 1200,
        height: 630,
        alt: "Pratyo platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pratyo",
    description:
      "School events, results, showcases, certificates, notices, and student challenges in one connected platform.",
    images: ["/pratyo-logo.png"],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
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
