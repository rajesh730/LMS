import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'E-Grantha Talent',
  description: 'Multi-school talent, extracurricular, and showcase platform',
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
