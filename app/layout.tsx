import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CasinoBackground from "@/components/CasinoBackground";
import FooterWrapper from "@/components/FooterWrapper";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "StreamerHub | stainzincs",
  description: "Canal oficial do stainzincs — Lives de cassino e muito mais!",
  icons: {
    icon: "/stain-icon.jpg",
    shortcut: "/stain-icon.jpg",
    apple: "/stain-icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white overflow-x-clip">
        <AuthProvider>
          <CasinoBackground />
          <Navbar />
          <main className="flex-1">{children}</main>
          <FooterWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
