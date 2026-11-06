export type SocialPlatform = "instagram" | "facebook" | "threads";

export type SocialLink = {
  platform: SocialPlatform;
  /** Display label, e.g. "Instagram". */
  label: string;
  /** Full https URL. Leave empty to hide the link everywhere. */
  url: string;
};

/**
 * Portrait shown on /about. Either point at an uploaded photo by id
 * (uses its medium derivative) or at a static file under `public/`.
 * Set to `null` to hide it.
 */
export type PortraitConfig =
  | { kind: "photo"; photoId: number; alt: string }
  | { kind: "static"; src: string; width: number; height: number; alt: string }
  | null;

export type AboutConfig = {
  heading: string;
  /** One string per paragraph. */
  bio: string[];
  portrait: PortraitConfig;
  /** Shooting types / services. Empty array hides the section. */
  services: string[];
  /**
   * Uploaded photo ids to feature (3–6). Empty array falls back to the newest photos.
   */
  featuredPhotoIds: number[];
};

export type ContactConfig = {
  /** Empty string hides the email link. */
  email: string;
  intro: string;
  social: SocialLink[];
};

const about: AboutConfig = {
  heading: "About",
  bio: [
    "截時光的一角，鑲上註解。",
    "拍攝我愛的我眼中的世界。",
  ],
  portrait: null,
  services: [],
  featuredPhotoIds: [],
};

const contact: ContactConfig = {
  email: "summer51202@gmail.com",
  intro: "合作、拍攝邀約或只是想打聲招呼，歡迎來信。",
  social: [
    { platform: "instagram", label: "Instagram", url: "https://www.instagram.com/summer51202/" },
    { platform: "facebook", label: "Facebook", url: "https://www.facebook.com/li.guang.ting.265568" },
    { platform: "threads", label: "Threads", url: "https://www.threads.com/@summer51202" },
  ],
};

export const siteConfig = {
  name: "Expose",
  photographerName: "Edward Lee",
  ownerReplyName: "Edward Lee",
  tagline: "Photography",
  description: "A personal photography portfolio - albums, moments, and the stories behind them.",
  adminPath: "/admin",
  loginPath: "/admin/login",
  aboutPath: "/about",
  contactPath: "/about#contact",
  about,
  contact,
} as const;
