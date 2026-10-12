import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import { Providers } from "@/components/providers";
import { Backdrop } from "@/components/backdrop";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Handwriting, used only for the annotation notes under the nav.
const hand = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Advance: get paid today, onchain",
  description: "Advances on money already on its way to you, repaid automatically from your next payment. Built on Monad.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#12161d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${hand.variable} h-full antialiased`}>
      <body className="grain min-h-full flex flex-col">
        <Backdrop />
        {/* Content layer sits above the fixed 3D backdrop. */}
        <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
