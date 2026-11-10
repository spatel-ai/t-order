import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/pos/AppHeader";
import { ToastHost } from "@/components/pos/Toast";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spice Route POS",
  description: "Table-based ordering and dynamic billing for restaurants",
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className={`${inter.variable} min-h-dvh`}>
        <AppHeader />
        <main>{children}</main>
        <ToastHost />
      </body>
    </html>
  );
}
