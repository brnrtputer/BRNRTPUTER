import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BRNRTPUTER",
  description: "BRNRTPUTER is an experimental agent that converses with users and feeds its interactions into brnrt.ai as part of an ongoing research study.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} antialiased font-mono`}
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
