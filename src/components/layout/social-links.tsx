import type { SocialLink, SocialPlatform } from "@/config/site";
import { getVisibleSocialLinks } from "@/lib/about/about-content";
import { cn } from "@/lib/utils";

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };

  switch (platform) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5A.5.5 0 0 1 14.5 8Z" />
        </svg>
      );
    case "threads":
      return (
        <svg {...common}>
          <path d="M16.5 11.2c-.4-2.4-2-3.7-4.4-3.7-2.6 0-4.1 1.8-4.1 1.8" />
          <path d="M16.6 11.4c2.6 1 3.4 3.4 2.4 5.6-1.2 2.6-4 4-7 4-4.7 0-8-3.4-8-9s3.3-9 8-9c3.6 0 6.2 1.8 7.3 4.9" />
          <path d="M16.6 11.4c-4.7-1-8.1.3-7.8 2.9.3 2.4 4.6 2.6 6.2.4.9-1.2 1.5-2.4 1.6-3.3" />
        </svg>
      );
  }
}

type SocialLinksProps = {
  links: readonly SocialLink[];
  /** Show the label next to the icon (About page) or icon only (footer). */
  showLabels?: boolean;
  className?: string;
  linkClassName?: string;
};

/** Renders nothing when every link is empty, so there is never a dead `<a>`. */
export function SocialLinks({ links, showLabels = false, className, linkClassName }: SocialLinksProps) {
  const visible = getVisibleSocialLinks(links);

  if (visible.length === 0) {
    return null;
  }

  return (
    <ul className={cn("flex flex-wrap items-center gap-4", className)}>
      {visible.map((link) => (
        <li key={`${link.platform}-${link.url}`}>
          <a
            href={link.url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={showLabels ? undefined : link.label}
            className={cn("inline-flex items-center gap-2 text-sm transition-colors", linkClassName)}
          >
            <SocialIcon platform={link.platform} />
            {showLabels ? <span>{link.label}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
