import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageViewBeacon } from "@/components/analytics/page-view-beacon";
import { ContextMenuGuard } from "@/components/gallery/context-menu-guard";
import { SocialLinks } from "@/components/layout/social-links";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { siteConfig, type PortraitConfig } from "@/config/site";
import {
  buildMailtoHref,
  buildPersonJsonLd,
  getVisibleSocialLinks,
  isUsableEmail,
  selectFeaturedPhotos,
  serializeJsonLd,
} from "@/lib/about/about-content";
import { getDisplayImageUrl } from "@/lib/photos/display-image";
import { getGalleryPhotos, getPhotoBySourceAndId } from "@/lib/photos/queries";
import { baseOpenGraph, buildPhotoPath, truncateDescription } from "@/lib/seo/metadata";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

// Featured photos and the portrait come from the data store, and the footer year
// should be the request year, so render on request (same as the home page).
export const dynamic = "force-dynamic";

const { about, contact, photographerName } = siteConfig;
const PAGE_PATH = siteConfig.aboutPath;
const PAGE_TITLE = "About";

function buildDescription() {
  const firstParagraph = about.bio.find((paragraph) => paragraph.trim() && !paragraph.startsWith("TODO"));

  return truncateDescription(
    firstParagraph ?? `About ${photographerName} — photography, contact and social links.`,
  );
}

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: buildDescription(),
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    ...baseOpenGraph,
    type: "profile",
    url: PAGE_PATH,
    title: `${PAGE_TITLE} · ${photographerName}`,
    description: buildDescription(),
  },
  twitter: {
    card: "summary_large_image",
    title: `${PAGE_TITLE} · ${photographerName}`,
    description: buildDescription(),
  },
};

type ResolvedPortrait = { src: string; width: number; height: number; alt: string; blurDataUrl?: string };

async function resolvePortrait(portrait: PortraitConfig): Promise<ResolvedPortrait | null> {
  if (!portrait) {
    return null;
  }

  if (portrait.kind === "static") {
    return { src: portrait.src, width: portrait.width, height: portrait.height, alt: portrait.alt };
  }

  const photo = await getPhotoBySourceAndId("uploaded", portrait.photoId);

  if (!photo) {
    return null;
  }

  return {
    src: getDisplayImageUrl(photo, "medium"),
    width: photo.width,
    height: photo.height,
    alt: portrait.alt,
    blurDataUrl: photo.blurDataUrl,
  };
}

export default async function AboutPage() {
  const [portrait, photos] = await Promise.all([resolvePortrait(about.portrait), getGalleryPhotos()]);
  const featured = selectFeaturedPhotos(photos.filter((photo) => photo.source === "uploaded"));
  const email = isUsableEmail(contact.email) ? contact.email.trim() : null;
  const socialLinks = getVisibleSocialLinks(contact.social);
  const bio = about.bio.filter((paragraph) => paragraph.trim());
  const services = about.services.filter((service) => service.trim());

  const jsonLd = buildPersonJsonLd({
    name: photographerName,
    url: toAbsoluteUrl(PAGE_PATH),
    description: buildDescription(),
    image: portrait ? toAbsoluteUrl(portrait.src) : undefined,
    email: email ?? undefined,
    sameAs: socialLinks.map((link) => link.url.trim()),
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-16 pt-20 sm:px-8 lg:px-12">
      <PageViewBeacon pageType="other" path={PAGE_PATH} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <section
        className={
          portrait
            ? "mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start"
            : "mt-6"
        }
      >
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">{about.heading}</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-900">{photographerName}</h1>
          <div className="mt-6 max-w-2xl space-y-5 leading-8 text-stone-700">
            {bio.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {/* Plain <a>: next/link appends a hash-only href to an existing hash (#contact#contact). */}
          <a
            href="#contact"
            className="mt-8 inline-flex rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
          >
            Get in touch
          </a>
        </div>

        {portrait ? (
          <ContextMenuGuard
            enabled
            className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-stone-200"
            style={{ aspectRatio: `${portrait.width} / ${portrait.height}` }}
          >
            <Image
              src={portrait.src}
              alt={portrait.alt}
              fill
              preload
              draggable={false}
              className="object-cover"
              sizes="(min-width: 1024px) 352px, (min-width: 640px) 384px, 100vw"
              placeholder={portrait.blurDataUrl ? "blur" : "empty"}
              blurDataURL={portrait.blurDataUrl}
            />
          </ContextMenuGuard>
        ) : null}
      </section>

      {services.length > 0 ? (
        <section className="mt-16">
          <SectionHeading eyebrow="Services" title="What I shoot" />
          <ul className="mt-6 flex flex-wrap gap-3">
            {services.map((service) => (
              <li
                key={service}
                className="rounded-full border border-stone-200 bg-white/70 px-4 py-2 text-sm text-stone-700"
              >
                {service}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="mt-16">
          <SectionHeading eyebrow="Selected work" title="A few favourites" />
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {featured.map((photo) => (
              <li key={photo.id}>
                <Link href={buildPhotoPath(photo)} className="group block">
                  <ContextMenuGuard
                    enabled
                    className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-stone-200"
                  >
                    <Image
                      src={getDisplayImageUrl(photo, "medium")}
                      alt={photo.title}
                      fill
                      draggable={false}
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(min-width: 1280px) 400px, (min-width: 640px) 31vw, 48vw"
                      placeholder={photo.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={photo.blurDataUrl}
                    />
                  </ContextMenuGuard>
                  <p className="mt-2 truncate text-sm text-stone-600 group-hover:text-stone-900">
                    {photo.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="contact" className="mt-16 scroll-mt-24">
        <Panel>
          <SectionHeading eyebrow="Contact" title="Say hello" description={contact.intro} />
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-8">
            {email ? (
              <a
                href={buildMailtoHref(email)}
                className="text-lg font-medium text-stone-900 underline-offset-4 hover:underline"
              >
                {email}
              </a>
            ) : null}
            <SocialLinks
              links={contact.social}
              showLabels
              linkClassName="text-stone-600 hover:text-stone-900"
            />
            {!email && socialLinks.length === 0 ? (
              <p className="text-sm text-stone-500">Contact details coming soon.</p>
            ) : null}
          </div>
        </Panel>
      </section>
    </main>
  );
}
