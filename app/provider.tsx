'use client';

import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "sonner";

export function Provider(props: { children?: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class">
      <SpeedInsights/>
      {props.children}
      <Toaster richColors position="top-center" closeButton />
    </ThemeProvider>
  );
}