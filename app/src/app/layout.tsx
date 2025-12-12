import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Arazzo Playground - Interactive OpenAPI Workflow Visualizer",
    template: "%s | Arazzo Playground",
  },
  description: "Visualize and explore Arazzo API workflows interactively. Edit YAML specifications in real-time with syntax highlighting, view flowcharts and sequence diagrams, and export to Mermaid format.",
  keywords: [
    "Arazzo",
    "OpenAPI",
    "API workflows",
    "workflow visualizer",
    "API orchestration",
    "sequence diagrams",
    "flowcharts",
    "Mermaid",
    "YAML editor",
    "API design",
    "REST API",
    "API documentation",
  ],
  authors: [{ name: "Connethics", url: "https://connethics.com" }],
  creator: "Connethics",
  publisher: "Connethics",
  metadataBase: new URL("https://arazzo.connethics.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://arazzo.connethics.com",
    siteName: "Arazzo Playground",
    title: "Arazzo Playground - Interactive OpenAPI Workflow Visualizer",
    description: "Visualize and explore Arazzo API workflows interactively. Edit YAML specifications in real-time, view flowcharts and sequence diagrams.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Arazzo Playground - Interactive API Workflow Visualizer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arazzo Playground - Interactive OpenAPI Workflow Visualizer",
    description: "Visualize and explore Arazzo API workflows interactively. Edit YAML, view flowcharts and sequence diagrams.",
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
    ],
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://arazzo.connethics.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
