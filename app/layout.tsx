import { StackProvider, StackTheme } from "@stackframe/stack";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { stackServerApp } from "../stack";
import "./globals.css";
import { Provider } from "./provider";
import script from "next/script";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClaraIA - Recepcionista Virtual",
  description: "Secretária 24 horas para o seu negócio",
  verification: {
    google: "P-kxupNYeAGDLojfD8k470_Qhpe27CJfu-fFWfpnJIw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YVMTRZ5Y0M"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-YVMTRZ5Y0M');
          `}
        </Script>
        <Provider>
          <StackProvider app={stackServerApp}>
            <StackTheme>{children}</StackTheme>
          </StackProvider>
        </Provider>
      </body>
    </html>
  );
}
