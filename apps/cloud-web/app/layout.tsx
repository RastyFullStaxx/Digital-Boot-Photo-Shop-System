import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Boot Cloud",
  description: "Admin and public share experience for photobooth sessions"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
