import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "داشبورد تحلیلی زرین‌پال",
  description: "داشبورد تحلیلی هوشمند پذیرندگان زرین‌پال – چالش سوم استارکوچ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
