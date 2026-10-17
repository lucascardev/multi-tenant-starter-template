import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { TypewriterTitle } from "./typewriter-title";

export interface HeroNotice {
  tag?: string;
  title: string;
  description: string;
}

export function Hero(props: {
  capsuleText: string;
  capsuleLink: string;
  title: string;
  subtitle: string;
  subtitlePrefix?: string;
  typingWords?: string[];
  credits?: React.ReactNode;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  notice?: HeroNotice;
}) {
  const isCapsuleExternal = props.capsuleLink.startsWith("http");
  const isPrimaryExternal = props.primaryCtaLink.startsWith("http");
  const isSecondaryExternal = props.secondaryCtaLink.startsWith("http");

  return (
    <section className="space-y-6 pt-36 pb-20 md:pt-48 md:pb-28 lg:pt-52 lg:pb-32">
      <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
        <Link
          href={props.capsuleLink}
          className="rounded-full bg-muted/80 border px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors hover:bg-muted inline-flex items-center gap-2"
          target={isCapsuleExternal ? "_blank" : undefined}
          rel={isCapsuleExternal ? "noreferrer" : undefined}
        >
          {props.capsuleText}
        </Link>
        <h1 className="font-heading text-3xl sm:text-5xl lg:text-7xl bg-gradient-to-r from-brand-purple to-brand-orange bg-clip-text text-transparent pb-2">
          {props.title}
        </h1>
        <div className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            {props.typingWords ? (
                <span>
                    {props.subtitlePrefix} <TypewriterTitle strings={props.typingWords} />
                </span>
            ) : (
                props.subtitle
            )}
        </div>

        {props.notice && (
          <div className="mx-auto my-2 w-full max-w-[44rem] rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 p-5 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              {props.notice.tag || "Pausa Momentânea"}
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
              {props.notice.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {props.notice.description}
            </p>
          </div>
        )}

        <div className="flex gap-4 flex-wrap justify-center mt-2">
          <Link
            href={props.primaryCtaLink}
            target={isPrimaryExternal ? "_blank" : undefined}
            rel={isPrimaryExternal ? "noreferrer" : undefined}
            className={cn(buttonVariants({ variant: isPrimaryExternal ? "whatsapp" : "default", size: "lg" }))}
          >
            {props.primaryCtaText}
          </Link>

          <Link
            href={props.secondaryCtaLink}
            target={isSecondaryExternal ? "_blank" : undefined}
            rel={isSecondaryExternal ? "noreferrer" : undefined}
            className={cn(buttonVariants({ variant: isSecondaryExternal ? "whatsapp" : "outline", size: "lg" }))}
          >
            {props.secondaryCtaText}
          </Link>
        </div>

        {props.credits && (
          <p className="text-sm text-muted-foreground mt-4">{props.credits}</p>
        )}
      </div>
    </section>
  );
}
