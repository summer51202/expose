# Public Image Exposure Reduction Phase 1 Design

## Goal

Reduce public exposure of original-resolution photo assets without claiming full download prevention.

Phase 1 is application-level protection. Public pages should not actively send original photo URLs or keys to the browser, and public image views should add low-friction controls against casual drag-save and right-click-save behavior.

This is not DRM. Any image shown in a browser can still be captured through screenshots, browser cache, devtools, or network inspection.

## Scope

Phase 1 includes:

- Public data flows must not include `originalUrl` or `originalKey`.
- Public browsing experiences must use `mediumUrl` and `thumbnailUrl`.
- Public client components must receive public photo DTOs rather than full photo records.
- All public images should disable native dragging where practical.
- Large public image stages should prevent the browser image context menu.
- Admin routes may continue to read complete photo records, including original metadata.
- Documentation must state the remaining storage risk when R2 originals are still public or URL-predictable.

Phase 1 excludes:

- Watermarking.
- R2 bucket or prefix privatization.
- Migration of existing original objects.
- Signed URLs.
- Admin-only original proxy or download routes.
- Full prevention of screenshots, devtools access, cache access, or network inspection.
- Global right-click blocking.
- Any restrictions on admin image-management pages.

## Current Context

The Prisma `Photo` model stores three public-facing URL fields:

- `originalUrl`
- `mediumUrl`
- `thumbnailUrl`

It also stores optional storage keys:

- `originalKey`
- `mediumKey`
- `thumbnailKey`

Existing public UI mostly displays `mediumUrl` or `thumbnailUrl`, but the full photo type and repository mapping can still carry `originalUrl` and `originalKey`. With Next.js Server Components, a value does not need to be rendered visibly to become part of a serialized client payload. Phase 1 therefore treats the public data boundary as the main protection surface.

## Public Photo DTO

Create or formalize a public photo DTO such as `PublicPhoto` or `PublicPhotoRecord`.

The DTO should include only fields required for public display and navigation:

```ts
type PublicPhoto = {
  id: number;
  albumId?: number;
  title: string;
  description?: string;
  location?: string;
  mediumUrl: string;
  thumbnailUrl: string;
  blurDataUrl?: string;
  width: number;
  height: number;
  takenAt?: Date | string;
  exifData?: unknown;
  createdAt?: Date | string;
};
```

The DTO must not include:

- `originalUrl`
- `originalKey`

The implementation should provide a focused mapping helper, such as `toPublicPhoto(photo)`, that strips original fields in one place. Public routes and public query helpers should map complete records to public DTOs on the server before passing data into client components.

## Public Data Flows

The public boundary applies to:

- Home page hero photos.
- Home page photo wall photos.
- Album page photo grid.
- Album Gallery Mode.
- Single photo detail page.
- Previous and next photo data on the single photo page.
- Album cover slideshows and public album previews.
- Any other public client component that receives photo objects.

Public client components should be typed to accept public DTOs, not full `PhotoRecord` objects. This prevents accidental reintroduction of original fields later.

Admin pages and admin query helpers may keep using complete photo records. Phase 1 should not remove original metadata from admin workflows.

## Frontend Friction

Phase 1 uses low-intrusion public image friction:

- Add `draggable={false}` to public image components where practical.
- Prevent `contextmenu` on the single photo detail main image.
- Prevent `contextmenu` on the Gallery Mode main image.
- Do not prevent context menus globally.
- Do not prevent context menus on admin pages.
- Do not place transparent overlays over images unless a specific component requires it.

This should reduce casual direct-save behavior without harming normal navigation, form usage, keyboard controls, or admin operations.

Small public images, such as thumbnails and cards, only need drag prevention in Phase 1. Right-click prevention is reserved for the large public viewing surfaces.

## Residual Risk

If R2 original objects remain public and their URLs are predictable, Phase 1 is not complete storage protection.

For example, if a public medium URL can be transformed into an original URL by changing `-medium.webp` to `-original.webp`, a technically motivated visitor may still locate original assets. Phase 1 only ensures the application does not actively expose those original URLs or keys through public data flows.

This limitation must remain visible in follow-up planning so the product does not mistake application-level protection for storage-level protection.

## Testing

Unit tests should cover the public mapper:

- A complete photo input containing `originalUrl` and `originalKey` maps to an output without those fields.
- `mediumUrl`, `thumbnailUrl`, dimensions, title, and other public display fields are preserved.
- The mapper handles optional fields consistently.

Component or query tests should cover public data boundaries:

- Public query helpers return public DTOs without `originalUrl` or `originalKey`.
- Public client component props are typed to public DTOs.
- Public gallery and detail image stages disable dragging.
- Public large image stages prevent the context menu.
- Admin query paths can still access original metadata.

Manual verification should include:

- Home page, album page, photo detail page, and Gallery Mode still display images normally.
- Single photo and Gallery Mode large images do not show the native browser image context menu.
- Public image navigation and Gallery Mode controls still work.
- Admin photo management still loads normally.
- Existing smoke verification still passes.

An optional later e2e check may scan rendered public pages or RSC payloads for original URL patterns, but this is not required for Phase 1 because Next.js payload formats may be brittle to assert directly.

## Acceptance Criteria

- Public-facing routes and public client components do not receive `originalUrl`.
- Public-facing routes and public client components do not receive `originalKey`.
- Public image display uses `mediumUrl` or `thumbnailUrl`.
- Public large image surfaces prevent native image context menus.
- Public images disable drag behavior where practical.
- Admin pages still retain access to complete photo records.
- The implementation documentation or code comments clearly note the residual risk of public, predictable R2 original URLs.

## Phase 2 Roadmap

Phase 2 may add storage-level protection:

1. R2 original privatization
   - Move original objects to a private prefix or private bucket.
   - Keep medium and thumbnail variants as public display assets.
   - Make new uploads follow the new storage layout.
   - Create a migration or runbook for existing public original objects.

2. Admin-only original access
   - Do not render permanent public `originalUrl` links in admin UI.
   - Use an admin-only proxy route or a server action that creates short-lived signed URLs.
   - Choose proxying for stronger control or signed URLs to reduce Railway traffic.

3. Storage URL hardening
   - Avoid predictable relationships between public display URLs and private original keys.
   - Review `R2_PUBLIC_BASE_URL` assumptions.
   - Review CSP `img-src` settings for the final public image delivery model.

Watermarking remains out of scope unless a future spec explicitly adds it.
