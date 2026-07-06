import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sola | Solar Decision Intelligence",
  description: "AI-powered solar site ranking and decision support for EPC teams, planners, and rooftop developers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
