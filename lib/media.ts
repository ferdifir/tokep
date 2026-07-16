import type { FeedPhoto } from "@/lib/photos";
import type { FeedVideo } from "@/lib/videos";

export type MediaItem =
  | (FeedPhoto & {
      type: "photo";
      saveKey: string;
    })
  | (FeedVideo & {
      type: "video";
      saveKey: string;
    });

export function photoSaveKey(filename: string) {
  return `photo:${filename}`;
}

export function videoSaveKey(filename: string) {
  return `video:${filename}`;
}

export function getCombinedMedia(videos: FeedVideo[], photos: FeedPhoto[]) {
  const videoItems: MediaItem[] = videos.map((video) => ({
    ...video,
    type: "video",
    saveKey: videoSaveKey(video.filename),
  }));
  const photoItems: MediaItem[] = photos.map((photo) => ({
    ...photo,
    type: "photo",
    saveKey: photoSaveKey(photo.filename),
  }));

  return [...photoItems, ...videoItems];
}
