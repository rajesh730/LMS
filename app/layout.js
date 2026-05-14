import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: "Pratyo",
  description: "School events, results, showcases, and certificates in one connected platform",
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
