"use client";

import { cn } from "@/lib/utils";
import { useStackApp, useUser } from "@stackframe/stack";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import * as React from "react";
import { ColorModeSwitcher } from "./color-mode-switcher";
import { Logo } from "./logo";
import { Button, buttonVariants } from "./ui/button";

interface NavProps {
  items?: {
    title: string;
    href: string;
    disabled?: boolean;
    external?: boolean;
  }[];
}

function SignInSignUpButtons() {
  const app = useStackApp();
  return (
    <>
      <Link
        href={app?.urls?.signIn || "/handler/sign-in"}
        className={buttonVariants({ variant: "secondary" })}
      >
        Log In
      </Link>

      <Link
        href={app?.urls?.signUp || "/handler/sign-up"}
        className={buttonVariants({ variant: "default" })}
      >
        Pré-Cadastro
      </Link>
    </>
  );
}

function AuthButtonsInner() {
  const user = useUser();

  if (user) {
    return (
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "default" })}
      >
        Dashboard
      </Link>
    );
  } else {
    return <SignInSignUpButtons />;
  }
}

function AuthButtons() {
  return (
    <React.Suspense fallback={<SignInSignUpButtons />}>
      <AuthButtonsInner />
    </React.Suspense>
  );
}

function MobileItems(props: NavProps) {
  return (
    <div className="fixed inset-0 top-24 z-50 grid h-[calc(100vh-6rem)] grid-flow-row auto-rows-max overflow-auto p-6 pb-32 animate-in slide-in-from-bottom-80 md:hidden">
      <div className="relative z-20 grid gap-6 rounded-md bg-popover p-4 text-popover-foreground shadow-md">
        <nav className="grid grid-flow-row auto-rows-max text-sm">
          {props.items?.map((item, index) => (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline",
                item.disabled && "cursor-not-allowed opacity-60"
              )}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
            >
              {item.title}
            </Link>
          ))}

          <div className="flex flex-col gap-2 mt-4">
            <AuthButtons />
          </div>
        </nav>
      </div>
    </div>
  );
}

function DesktopItems(props: NavProps) {
  const segment = useSelectedLayoutSegment();

  return (
    <nav className="hidden gap-6 md:flex">
      {props.items?.map((item, index) => (
        <Link
          key={index}
          href={item.disabled ? "#" : item.href}
          className={cn(
            "flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm",
            item.href.startsWith(`/${segment}`)
              ? "text-foreground"
              : "text-foreground/60",
            item.disabled && "cursor-not-allowed opacity-80"
          )}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noreferrer" : undefined}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}

export function LandingPageHeader(props: NavProps) {
  const [showMobileMenu, setShowMobileMenu] = React.useState<boolean>(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background/80 backdrop-blur border-b">
      <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 px-3 py-2 text-center text-xs md:text-sm font-medium text-amber-900 dark:text-amber-200">
        <div className="container flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-800 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Aviso Importante
          </span>
          <span>
            Novas ativações momentaneamente em pausa técnica para expansão.
          </span>
          <a
            href="https://wa.me/5577999457636?text=Ol%C3%A1%2C%20gostaria%20de%20entrar%20na%20fila%20de%20espera%20da%20Clara%20e%20garantir%20meu%20desconto%20de%2040%25%21"
            target="_blank"
            rel="noreferrer"
            className="underline font-semibold hover:opacity-80 transition-opacity ml-1 inline-flex items-center gap-1"
          >
            Entrar na Fila com 40% OFF &rarr;
          </a>
        </div>
      </div>

      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-10">
          <Logo className="hidden md:flex" />

          {props.items?.length ? <DesktopItems items={props.items} /> : null}

          <Button
            className="space-x-2 md:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? (
              <X className="h-6 w-6" /> 
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>

          <Logo className="md:hidden" />

          {showMobileMenu && props.items && <MobileItems items={props.items} />}
        </div>

        <div className="flex gap-4 items-center">
          <ColorModeSwitcher />
          <nav className="gap-4 items-center hidden md:flex">
            <AuthButtons />
          </nav>
        </div>
      </div>
    </header>
  );
}
