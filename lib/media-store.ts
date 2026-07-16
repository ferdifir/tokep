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

async function findPersonalizedMediaPage({
  cursor,
  limit,
  type,
  userId,
}: {
  cursor?: string;
  limit: number;
  type: MediaType;
  userId: string;
}) {
  const offset = cursor ? Number.parseInt(cursor, 10) : 0;
  const safeOffset = Number.isFinite(offset) && offset > 0 ? offset : 0;
  const take = Math.max(limit * 5, 30);
  const [affinities, rows, viewCounts] = await Promise.all([
    prisma.userTagAffinity.findMany({
      orderBy: { score: "desc" },
      select: { score: true, tagId: true },
      take: 30,
      where: { userId },
    }),
    prisma.media.findMany({
      include: {
        tags: {
          select: { tagId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      where: { type, visible: true },
    }),
    prisma.mediaView.groupBy({
      _count: { id: true },
      by: ["mediaId"],
      where: { userId },
    }),
  ]);
  const affinityByTag = new Map(
    affinities.map((affinity) => [affinity.tagId, affinity.score]),
  );
  const viewsByMedia = new Map(
    viewCounts.map((view) => [view.mediaId, view._count.id]),
  );
  const now = Date.now();
  const scored = rows
    .map((media) => {
      const tagScore = media.tags.reduce(
        (total, tag) => total + (affinityByTag.get(tag.tagId) ?? 0),
        0,
      );
      const views = viewsByMedia.get(media.id) ?? 0;
      const ageDays = Math.max(
        0,
        (now - media.createdAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const freshness = Math.max(0, 5 - ageDays * 0.2);
      const unseen = views === 0 ? 6 : 0;
      const repeatPenalty = views * 4;

      return {
        media,
        score: tagScore * 2 + freshness + unseen - repeatPenalty,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.media.createdAt.getTime() - a.media.createdAt.getTime();
    });
  const pageItems = scored.slice(safeOffset, safeOffset + limit).map((item) => item.media);
  const nextOffset = safeOffset + pageItems.length;

  return {
    items: pageItems,
    nextCursor: nextOffset < scored.length ? String(nextOffset) : null,
  };
}

export async function getVideoPage(
  limit = defaultLimits.videos,
  cursor?: string,
  userId?: string | null,
) {
  const page = userId
    ? await findPersonalizedMediaPage({ cursor, limit, type: "VIDEO", userId })
    : await findMediaPage("VIDEO", limit, cursor);

  return {
    items: page.items.map(mediaToFeedVideo),
    nextCursor: page.nextCursor,
  };
}

export async function getPhotoPage(
  limit = defaultLimits.photos,
  cursor?: string,
  userId?: string | null,
) {
  const page = userId
    ? await findPersonalizedMediaPage({ cursor, limit, type: "PHOTO", userId })
    : await findMediaPage("PHOTO", limit, cursor);

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
