import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sola",
  description: "Solar site intelligence for commercial rooftops and viable project discovery.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
