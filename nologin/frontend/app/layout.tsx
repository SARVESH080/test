import type { Metadata } from 'next';
import { Fraunces, Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', weight: ['400', '600'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const reading = Source_Serif_4({ subsets: ['latin'], variable: '--font-reading' });

export const metadata: Metadata = {
  title: 'Reader',
  description: 'Your personal, distraction-free reading library.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${reading.variable}`}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
