import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://arazzo.connethics.com";
const TITLE = "Arazzo Studio by ConnEthics — API workflows humans can read and machines can run";
const DESCRIPTION =
  "Free, browser-based studio for Arazzo 1.1 API workflows: edit YAML, see the workflow graph, generate documentation and validate against the official schema. OpenAPI and AsyncAPI steps, dependsOn, Selectors. By ConnEthics.";

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: "%s | Arazzo Studio by ConnEthics",
  },
  description: DESCRIPTION,
  applicationName: "Arazzo Studio by ConnEthics",
  keywords: [
    "Arazzo",
    "Arazzo 1.1",
    "OpenAPI",
    "AsyncAPI",
    "API workflows",
    "workflow editor",
    "API documentation",
    "end-to-end API testing",
    "MCP tools",
    "AI agents",
    "dependsOn",
    "Selector Object",
    "ConnEthics",
  ],
  authors: [{ name: "ConnEthics", url: "https://www.connethics.com" }],
  creator: "ConnEthics",
  publisher: "ConnEthics",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Arazzo Studio by ConnEthics",
    title: TITLE,
    description:
      "Edit, visualize and document Arazzo 1.1 workflows in your browser. One workflow: partner documentation, end-to-end test, AI agent tool.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Arazzo Studio by ConnEthics — API workflows humans can read and machines can run",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Edit, visualize and document Arazzo 1.1 workflows in your browser. Free to use, MIT-licensed core packages.",
    images: ["/og-image.png"],
    creator: "@connethics",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
