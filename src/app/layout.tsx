import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Fira_Sans, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { CompactModeSync } from "@/components/layout/compact-mode-sync";
import { PwaRegister } from "@/components/pwa/pwa-register";
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
    "AI-powered relationship intelligence and warm-introduction platform. Search your network, discover opportunities, and get warm intros.",
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
    { media: "(prefers-color-scheme: light)", color: "#4A6741" },
    { media: "(prefers-color-scheme: dark)", color: "#3D5C36" },
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
        <ThemeProvider>
          <CompactModeSync />
          <PwaRegister />
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
