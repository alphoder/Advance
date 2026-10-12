import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Advance: get paid today, onchain",
  description: "Advances on money already on its way to you, repaid automatically from your next payment. Built on Monad.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#060b1c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="grain min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
