import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import QueryProvider from "@/components/providers/QueryProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin Dashboard | Institutional Management",
  description: "Comprehensive admin dashboard for managing students, teachers, fees, salaries, and expenses across institutional branches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full`}>
      <body className="h-full flex overflow-hidden">
        <QueryProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="p-4 pt-16 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 max-w-[1440px] mx-auto">
              {children}
            </div>
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
