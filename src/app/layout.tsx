import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weberry Task Board",
  description: "Shared task board for Weberry workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
