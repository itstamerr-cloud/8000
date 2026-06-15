import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "إدارة استهداف الحسابات",
  description: "توزيع وإدارة استهداف حسابات الشركات على فريق المبيعات الميداني",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-sans">
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}
