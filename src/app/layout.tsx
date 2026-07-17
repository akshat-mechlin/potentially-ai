import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Serif_Display, Fira_Sans, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SplashStatic } from "@/components/pwa/splash-static";
import { SPLASH_BOOTSTRAP_SCRIPT } from "@/components/pwa/splash-bootstrap";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Potentially.ai | Relationship Intelligence",
  description:
    "Relationship intelligence for warm introductions. Search your network, discover opportunities, and get warm intros.",
  applicationName: "Potentially",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Potentially",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2D4739" },
    { media: "(prefers-color-scheme: dark)", color: "#1A2820" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${firaSans.variable} ${dmSerifDisplay.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className={`${firaSans.className} antialiased`} suppressHydrationWarning>
        <Script
          id="potentially-splash-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: SPLASH_BOOTSTRAP_SCRIPT }}
        />
        <SplashStatic />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
