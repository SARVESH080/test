import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter, Lora, Literata } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-reading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bookbind — read anything, beautifully",
  description:
    "Upload a PDF or EPUB, or paste an article link, and read it in a distraction-free, Kindle-style interface. No sign-up, no server, no tracking — everything happens in your browser.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1c1917",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sourceSerif.variable} ${lora.variable} ${inter.variable} ${literata.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
