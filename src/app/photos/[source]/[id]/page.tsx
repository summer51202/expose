import Link from "next/link";
import { notFound } from "next/navigation";

import { PageViewBeacon } from "@/components/analytics/page-view-beacon";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentList } from "@/components/comments/comment-list";
import { PhotoStage } from "@/components/gallery/photo-stage";
import { LikeButton } from "@/components/likes/like-button";
import { Panel } from "@/components/ui/panel";
import { getCommentsByPhoto } from "@/lib/comments/queries";
import { getLikeSummaryByPhoto } from "@/lib/likes/queries";
import { resolveAlbumViewMode, resolvePhotoIdParam } from "@/lib/gallery/album-gallery-url";
import { getExifDisplayFields } from "@/lib/photos/exif";
import {
  getPhotoBySourceAndId,
  getPhotoNeighbors,
} from "@/lib/photos/queries";

type PhotoViewerPageProps = {
  params: Promise<{
    source: string;
    id: string;
  }>;
  searchParams?: Promise<{
    returnAlbum?: string;
    returnView?: string;
    returnPhoto?: string;
  }>;
};

export default async function PhotoViewerPage({ params, searchParams }: PhotoViewerPageProps) {
  const { source, id } = await params;
  const returnParams = searchParams ? await searchParams : {};
  const photo = await getPhotoBySourceAndId(source, Number(id));

  if (!photo) {
    notFound();
  }

  const [neighbors, exifFields, comments, likeSummary] = await Promise.all([
    getPhotoNeighbors(photo.source, photo.id),
    Promise.resolve(getExifDisplayFields(photo.exifData ?? null)),
    getCommentsByPhoto(photo.source, photo.id),
    getLikeSummaryByPhoto(photo.source, photo.id),
  ]);
  const returnAlbum = returnParams.returnAlbum ?? photo.albumSlug;
  const returnView = resolveAlbumViewMode(returnParams.returnView ?? null);
  const returnPhoto = resolvePhotoIdParam(returnParams.returnPhoto ?? null) ?? photo.id;
  const backHref = returnAlbum
    ? `/albums/${encodeURIComponent(returnAlbum)}?view=${returnView}&photo=${returnPhoto}`
    : "/";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-12 pt-20 sm:px-8 lg:px-12">
      <PageViewBeacon pageType="photo" path={`/photos/${photo.source}/${photo.id}`} />

      {/* Top navigation bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-sm text-white/50 transition hover:text-white/90"
        >
          ← Back
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {neighbors.previous ? (
            <Link
              href={`/photos/${neighbors.previous.source}/${neighbors.previous.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:text-white"
              aria-label="Previous photo"
            >
              ←
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 text-white/20">
              ←
            </span>
          )}
          {neighbors.next ? (
            <Link
              href={`/photos/${neighbors.next.source}/${neighbors.next.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/40 hover:text-white"
              aria-label="Next photo"
            >
              →
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 text-white/20">
              →
            </span>
          )}
        </div>
      </div>

      {/* Main content: photo stage + info column */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">

        {/* Left: photo stage */}
        <div className="flex min-h-[60vh] items-center justify-center overflow-hidden rounded-[1.5rem] bg-black lg:min-h-[85vh]">
          <PhotoStage photo={photo} priority />
        </div>

        {/* Right: info column */}
        <div className="flex flex-col gap-4">

          {/* Block 1: title + description */}
          <div className="border-b border-white/10 pb-5">
            <p className="text-xs tracking-[0.25em] text-white/35 uppercase">
              {photo.albumName ?? "Photography"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-snug text-white">
              {photo.title}
            </h1>
            {photo.description?.trim() ? (
              <p className="mt-3 text-sm leading-7 text-white/65">{photo.description}</p>
            ) : null}
          </div>

          {/* Block 2: Interactions (like + comments) */}
          <Panel>
            <h2 className="flex items-baseline gap-3 text-base font-semibold text-foreground">
              Interactions
              <span className="text-sm font-normal text-foreground/45">
                ♡ {likeSummary.likeCount} · 💬 {comments.length}
              </span>
            </h2>

            <div className="mt-4">
              <LikeButton
                photoId={photo.id}
                photoSource={photo.source}
                likeCount={likeSummary.likeCount}
                likedByCurrentVisitor={likeSummary.likedByCurrentVisitor}
              />
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-medium text-foreground/60">Leave a comment</p>
              <div className="mt-4">
                <CommentForm photoId={photo.id} photoSource={photo.source} />
              </div>
              <div className="mt-6">
                <CommentList comments={comments} />
              </div>
            </div>
          </Panel>

          {/* Block 3: Photo Info + EXIF (collapsible) */}
          <Panel>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-foreground/60 hover:text-foreground/90 transition-colors">
                <span>Photo Details</span>
                <span className="text-foreground/40 transition-transform duration-200 group-open:rotate-180">
                  ↓
                </span>
              </summary>

              <div className="mt-4 grid gap-0 text-sm text-foreground/65">
                <div className="flex justify-between gap-3 border-b border-line py-2">
                  <span>Shot</span>
                  <span className="text-right text-foreground/90">
                    {photo.shotAt
                      ? new Date(photo.shotAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-b border-line py-2">
                  <span>Album</span>
                  <span className="text-right text-foreground/90">{photo.albumName ?? "—"}</span>
                </div>
                <div className={`flex justify-between gap-3 py-2 ${exifFields.length > 0 ? "border-b border-line" : ""}`}>
                  <span>Resolution</span>
                  <span className="text-foreground/90">
                    {photo.width} × {photo.height}
                  </span>
                </div>

                {exifFields.map((field, i) => (
                  <div
                    key={field.label}
                    className={`flex justify-between gap-3 py-2 ${i < exifFields.length - 1 ? "border-b border-line" : ""}`}
                  >
                    <span>{field.label}</span>
                    <span className="text-right text-foreground/90">{field.value}</span>
                  </div>
                ))}
              </div>
            </details>
          </Panel>

        </div>
      </section>
    </main>
  );
}
