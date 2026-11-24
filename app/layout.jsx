import './globals.css';
import { RevealInit } from '@/components/Shell';

// Root of the whole site: the Department of International Relations (/) and its events, such as UOK MUN (/uokmun).
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://iruok.com'),
  title: 'Department of International Relations | University of Kotli',
  description: 'Department of International Relations, University of Kotli, Azad Jammu and Kashmir: programmes, events, news and UOK MUN.',
  icons: { icon: '/uok-logo.png' }
};
export const viewport = { themeColor: '#0F1E45' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RevealInit />
      </body>
    </html>
  );
}
