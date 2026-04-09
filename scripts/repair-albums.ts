import { repairAlbumSlugs } from "@/lib/albums/repair";

async function main() {
  const result = await repairAlbumSlugs();
  console.log(
    `Repaired ${result.albumCount} albums and synchronized ${result.photoCount} album-linked photos.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
