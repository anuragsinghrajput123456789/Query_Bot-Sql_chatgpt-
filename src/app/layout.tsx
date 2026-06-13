import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NF QueryGPT | AI-Powered SQLite Assistant",
  description: "Ask questions in English or Hinglish and fetch safe SQL results from SQLite database.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
