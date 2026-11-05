"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#albums", label: "Albums" },
  { href: siteConfig.aboutPath, label: "About" },
] as const;

type SiteHeaderProps = {
  theme?: "light" | "dark";
};

export function SiteHeader({ theme = "light" }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 72);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? isDark
            ? "border-b border-white/10 bg-[#0c0c0c]/95 backdrop-blur"
            : "border-b border-stone-200/60 bg-white/95 backdrop-blur"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className={cn(
            "text-sm font-medium tracking-[0.25em] uppercase transition-colors",
            isDark ? "text-white" : scrolled ? "text-stone-900" : "text-stone-800",
          )}
        >
          Expose
        </Link>

        <nav aria-label="Main" className="flex items-center gap-5 sm:gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap text-sm transition-colors",
                isDark
                  ? "text-white/70 hover:text-white"
                  : scrolled
                    ? "text-stone-600 hover:text-stone-900"
                    : "text-stone-700 hover:text-stone-900",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
