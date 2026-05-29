import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PDF to Word Converter - Free & Private",
  description: "Convert PDF to Word documents instantly in your browser. 100% free, no uploads, fully private. Perfect for US users who value privacy.",
  keywords: ["PDF to Word", "PDF converter", "Word converter", "free PDF tools", "privacy first", "no upload"],
  openGraph: {
    title: "PDF to Word Converter - Free & Private",
    description: "Convert PDF to Word documents instantly in your browser. 100% free, no uploads, fully private.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
