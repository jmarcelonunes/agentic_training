import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Review Bot",
  description: "Get instant, AI-powered feedback on your Python and C# code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
