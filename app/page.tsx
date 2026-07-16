import { BottomNav } from "@/app/components/bottom-nav";
import { VideoFeed } from "@/app/components/video-feed";
import { getVideoPage } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const videos = await getVideoPage();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black">
      <div className="min-h-0 flex-1">
        <VideoFeed
          initialNextCursor={videos.nextCursor}
          initialVideos={videos.items}
        />
      </div>
      <BottomNav />
    </div>
  );
}
