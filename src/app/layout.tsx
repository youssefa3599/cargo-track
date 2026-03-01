import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navigation from "@/components/navigation";  // ✅ FIX: Capital N

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "Cargo Tracking System",
  description: "Track and manage your cargo shipments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        <AuthProvider>
          <Navigation />  {/* ✅ FIX: Capital N */}
          <main className="min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}