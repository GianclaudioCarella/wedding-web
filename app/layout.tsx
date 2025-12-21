import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gian & Cat Wedding",
  description: "Join us in celebrating our special day",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
