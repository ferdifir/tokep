import { prisma } from "@/lib/db";

const maxMediaTags = 12;

export function tagSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function parseHashtags(input: string) {
  const matches = input.matchAll(/#([\p{L}\p{N}_-]{1,40})/gu);
  const names: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const name = match[1]?.replace(/[_-]+/g, " ").trim();
    const slug = tagSlug(name ?? "");

    if (!name || !slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    names.push(name.toLowerCase());

    if (names.length >= maxMediaTags) {
      break;
    }
  }

  return names;
}

export async function incrementUserTagAffinity({
  mediaId,
  score,
  userId,
}: {
  mediaId: string;
  score: number;
  userId: string;
}) {
  const mediaTags = await prisma.mediaTag.findMany({
    select: { tagId: true },
    where: { mediaId },
  });

  if (!mediaTags.length) {
    return;
  }

  await prisma.$transaction(
    mediaTags.map((mediaTag) =>
      prisma.userTagAffinity.upsert({
        create: {
          score,
          tagId: mediaTag.tagId,
          userId,
        },
        update: {
          score: {
            increment: score,
          },
        },
        where: {
          userId_tagId: {
            tagId: mediaTag.tagId,
            userId,
          },
        },
      }),
    ),
  );
}

export async function recordMediaView({
  completed,
  durationMs,
  mediaId,
  userId,
}: {
  completed?: boolean;
  durationMs?: number | null;
  mediaId: string;
  userId: string;
}) {
  await prisma.mediaView.create({
    data: {
      completed: Boolean(completed),
      durationMs: durationMs ?? null,
      mediaId,
      userId,
    },
  });

  const score = completed ? 3 : durationMs && durationMs >= 3000 ? 1.5 : 0.5;

  await incrementUserTagAffinity({ mediaId, score, userId });
}

export async function setMediaTags({
  mediaId,
  names,
}: {
  mediaId: string;
  names: string[];
}) {
  const cleanNames = [
    ...new Set(
      names.map((name) => name.replace(/^#+/, "").trim()).filter(Boolean),
    ),
  ]
    .map((name) => name.slice(0, 40))
    .slice(0, maxMediaTags);

  const tags = [];

  for (const name of cleanNames) {
    const slug = tagSlug(name);

    if (!slug) {
      continue;
    }

    tags.push(
      await prisma.tag.upsert({
        create: { name, slug },
        update: { name },
        where: { slug },
      }),
    );
  }

  await prisma.$transaction([
    prisma.mediaTag.deleteMany({ where: { mediaId } }),
    ...tags.map((tag) =>
      prisma.mediaTag.create({
        data: {
          mediaId,
          tagId: tag.id,
        },
      }),
    ),
  ]);

  return getMediaTags(mediaId);
}

export async function getMediaTags(mediaId: string) {
  const mediaTags = await prisma.mediaTag.findMany({
    include: { tag: true },
    orderBy: { createdAt: "asc" },
    where: { mediaId },
  });

  return mediaTags.map((mediaTag) => mediaTag.tag);
}
