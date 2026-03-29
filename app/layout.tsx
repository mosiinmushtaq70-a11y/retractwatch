import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "RetractWatch — Bibliography integrity",
  description:
    "Detect retracted science and cascade contamination before reviewers do. Hackathon UI preview.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      style={
        {
          // Keep CSS variable contract without next/font network fetches.
          "--font-dm-sans":
            "Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
          "--font-instrument": "Georgia, Cambria, Times New Roman, serif",
        } as React.CSSProperties
      }
    >
      <body className="rw-bg rw-grid min-h-dvh antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
