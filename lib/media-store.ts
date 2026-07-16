import type { FeedPhoto } from "@/lib/photos";
import type { FeedVideo } from "@/lib/videos";
import { prisma } from "@/lib/db";
import type { Media, MediaType } from "@/lib/generated/prisma/client";

const defaultLimits = {
  photos: 12,
  saved: 18,
  videos: 5,
};

function clampLimit(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 30);
}

export function getLimit(searchParams: URLSearchParams, fallback: number) {
  return clampLimit(searchParams.get("limit"), fallback);
}

export function mediaToFeedVideo(media: Media): FeedVideo {
  return {
    id: media.id,
    filename: media.filename,
    src: media.src,
    title: media.title,
  };
}

export function mediaToFeedPhoto(media: Media): FeedPhoto {
  return {
    id: media.id,
    filename: media.filename,
    src: media.src,
    title: media.title,
  };
}

async function findMediaPage(type: MediaType, limit: number, cursor?: string) {
  const rows = await prisma.media.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { id: "asc" },
    skip: cursor ? 1 : 0,
    take: limit + 1,
    where: { type, visible: true },
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}

export async function getVideoPage(limit = defaultLimits.videos, cursor?: string) {
  const page = await findMediaPage("VIDEO", limit, cursor);

  return {
    items: page.items.map(mediaToFeedVideo),
    nextCursor: page.nextCursor,
  };
}

export async function getPhotoPage(limit = defaultLimits.photos, cursor?: string) {
  const page = await findMediaPage("PHOTO", limit, cursor);

  return {
    items: page.items.map(mediaToFeedPhoto),
    nextCursor: page.nextCursor,
  };
}

export async function getSavedPage({
  cursor,
  limit = defaultLimits.saved,
  userId,
}: {
  cursor?: string;
  limit?: number;
  userId: string;
}) {
  const rows = await prisma.savedMedia.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    include: { media: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: cursor ? 1 : 0,
    take: limit + 1,
    where: {
      media: {
        visible: true,
      },
      userId,
    },
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map((item) => ({
      id: item.media.id,
      filename: item.media.filename,
      saveId: item.id,
      src: item.media.src,
      title: item.media.title,
      type: item.media.type === "VIDEO" ? "video" : "photo",
    })),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}
