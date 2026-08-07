import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bike Planet — плоские веломаршруты",
  description: "Велосипедные маршруты с учётом набора высоты и комфортного уклона",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
