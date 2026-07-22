import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fernweg — a quieter place to read",
  description:
    "Turn any PDF into a clean, immersive, Kindle-like reading experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
