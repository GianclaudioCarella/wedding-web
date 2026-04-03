import type { Metadata } from "next";
import { Hedvig_Letters_Sans, Hedvig_Letters_Serif } from 'next/font/google'
import "./globals.css";

const hedvigSans = Hedvig_Letters_Sans({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const hedvigSerif = Hedvig_Letters_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

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
    <html lang="en" className={`${hedvigSans.variable} ${hedvigSerif.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
