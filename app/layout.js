import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
// ClientProviderWrapper carries the "use client" boundary so this
// file can remain a Server Component (required for metadata + fonts)
import ClientProviderWrapper from "./components/ClientProviderWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata is exported from layout so Next.js can set the page <title> and
// meta description automatically for every route.
export const metadata = {
  title: "my-crm",
  description: "Multi-client CRM loyalty platform",
};

// RootLayout wraps every page in the app — anything rendered here
// (like Nav) appears on every route automatically.
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* ClientProviderWrapper makes the selected client available to
          every component in the tree. Nav and all pages read from it. */}
      <body className="min-h-full flex flex-col">
        <ClientProviderWrapper>
          <Nav />
          {children}
        </ClientProviderWrapper>
      </body>
    </html>
  );
}
