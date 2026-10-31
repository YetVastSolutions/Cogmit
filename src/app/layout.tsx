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

const defaultBaseUrl = process.env.NEXT_PUBLIC_APP_URL 
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  || "https://cogmit.com";

export const metadata: Metadata = {
  metadataBase: new URL(defaultBaseUrl),
  title: "Cogmit",
  description: "GitHub-native cognition repository",
  icons: {
    icon: "/cogmitLogo.png",
  },
  openGraph: {
    siteName: "Cogmit",
    type: "website",
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
