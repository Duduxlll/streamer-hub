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
    icon: "https://static-cdn.jtvnw.net/jtv_user_pictures/8c7083c8-3b8e-4f5e-abe2-d681f5b6df8b-profile_image-300x300.png",
    shortcut: "https://static-cdn.jtvnw.net/jtv_user_pictures/8c7083c8-3b8e-4f5e-abe2-d681f5b6df8b-profile_image-300x300.png",
    apple: "https://static-cdn.jtvnw.net/jtv_user_pictures/8c7083c8-3b8e-4f5e-abe2-d681f5b6df8b-profile_image-300x300.png",
  },
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
          <FooterWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
