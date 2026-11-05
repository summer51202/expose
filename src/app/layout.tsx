import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { resolveSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

const defaultTitle = `${siteConfig.name} — ${siteConfig.photographerName} ${siteConfig.tagline}`;

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: defaultTitle,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.photographerName }],
  creator: siteConfig.photographerName,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: defaultTitle,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
