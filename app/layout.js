import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Nav is a client component — safe to import into a Server Component layout
import Nav from "./components/Nav";

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
      {/* Nav renders above every page's content */}
      <body className="min-h-full flex flex-col">
        <Nav />
        {children}
      </body>
    </html>
  );
}
