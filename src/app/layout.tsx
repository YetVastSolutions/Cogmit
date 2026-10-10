import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GlobalNav } from "@/components/GlobalNav";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cogmit",
  description: "GitHub-native cognition repository",
  icons: {
    icon: "/cogmitLogo.png",
  },
};

import { checkSessionStatus } from "@/lib/auth-actions";
import { AuthProvider } from "@/components/AuthProvider";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionStatus = await checkSessionStatus();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        <AuthProvider initialSession={sessionStatus}>
          <GlobalNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
