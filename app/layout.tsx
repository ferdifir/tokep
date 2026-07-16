import type { Metadata } from "next";
import { TelegramBridge } from "@/app/components/telegram-bridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tokep",
  description: "Telegram mini app video feed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full bg-black antialiased">
      <body className="h-full overflow-hidden bg-black">
        {children}
        <TelegramBridge />
      </body>
    </html>
  );
}
