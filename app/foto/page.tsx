import { BottomNav } from "@/app/components/bottom-nav";
import { PhotoGrid } from "@/app/components/photo-grid";
import { getPhotoPage } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function PhotoPage() {
  const photos = await getPhotoPage();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black text-white">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-none px-3 py-3">
        <PhotoGrid
          initialNextCursor={photos.nextCursor}
          initialPhotos={photos.items}
        />
      </main>
      <BottomNav />
    </div>
  );
}
