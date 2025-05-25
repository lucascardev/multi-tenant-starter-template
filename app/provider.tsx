'use client';

import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/next"

export function Provider(props: { children?: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class">
      <SpeedInsights/>
      {props.children}
    </ThemeProvider>
  );
}