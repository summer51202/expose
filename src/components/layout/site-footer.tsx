import Link from "next/link";

import { SocialLinks } from "@/components/layout/social-links";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  theme?: "light" | "dark";
};

/**
 * Server Component: the year is computed during the server render and sent as HTML,
 * so the client never recomputes it (no hydration mismatch around New Year).
 */
export function SiteFooter({ theme = "light" }: SiteFooterProps) {
  const isDark = theme === "dark";
  const year = new Date().getFullYear();
  const linkClass = isDark
    ? "text-white/55 hover:text-white"
    : "text-stone-500 hover:text-stone-900";

  return (
    <footer
      className={cn(
        "mt-auto border-t",
        isDark ? "border-white/10 bg-[#0c0c0c] text-white/45" : "border-stone-200/70 text-stone-500",
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>
          © {year} {siteConfig.photographerName}. All rights reserved.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <nav aria-label="Footer" className="flex items-center gap-5">
            <Link href={siteConfig.aboutPath} className={cn("transition-colors", linkClass)}>
              About
            </Link>
            <Link href={siteConfig.contactPath} className={cn("transition-colors", linkClass)}>
              Contact
            </Link>
          </nav>
          <SocialLinks links={siteConfig.contact.social} linkClassName={linkClass} />
        </div>
      </div>
    </footer>
  );
}
