import { Inter, JetBrains_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata = {
  title: {
    default: "KLSE MarketCap — Bursa Malaysia Stock Screener",
    template: "%s | KLSE MarketCap",
  },
  description:
    "Track every stock and ETF on Bursa Malaysia. Live prices, market cap rankings, financials, and charts for all KLSE-listed securities.",
  metadataBase: new URL("https://klsemarketcap.com"),
  openGraph: {
    type: "website",
    locale: "en_MY",
    siteName: "KLSE MarketCap",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
