import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coach Staf Bijeenkomst",
  description: "Interactieve presentaties met live vragen, QR-code en publieksreacties.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
