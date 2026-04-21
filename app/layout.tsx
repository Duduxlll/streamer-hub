import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CasinoBackground from "@/components/CasinoBackground";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "StreamerHub | NomeTeste",
  description: "Canal oficial do NomeTeste — Lives de cassino e muito mais!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white">
        <AuthProvider>
          <CasinoBackground />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
