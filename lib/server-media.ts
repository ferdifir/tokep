import crypto from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getPhotoContentType, isPhotoFile, photoDir } from "@/lib/photos";
import { contentDir } from "@/lib/videos";

export const maxPhotoSize = 10 * 1024 * 1024;
export const maxVideoSize = 100 * 1024 * 1024;

const photoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const videoExtensions = new Set([".mp4"]);

export type UploadedMediaKind = "photo" | "video";

function getExtension(filename: string) {
  return path.extname(filename).toLowerCase();
}

export function detectMediaKind(filename: string, type: string): UploadedMediaKind | null {
  const extension = getExtension(filename);

  if (photoExtensions.has(extension) && type.startsWith("image/")) {
    return "photo";
  }

  if (videoExtensions.has(extension) && type === "video/mp4") {
    return "video";
  }

  return null;
}

export function getMediaDirectory(kind: UploadedMediaKind) {
  return kind === "photo" ? photoDir : contentDir;
}

export function mediaSrcForFilename(kind: UploadedMediaKind, filename: string) {
  const segment = kind === "photo" ? "photos" : "videos";

  return `/api/${segment}/${encodeURIComponent(filename)}`;
}

export function safeStoredFilename(originalName: string) {
  const extension = getExtension(originalName);
  const random = crypto.randomBytes(8).toString("hex");

  return `${Date.now()}-${random}${extension}`;
}

export function safeExistingMediaPath(kind: UploadedMediaKind, filename: string) {
  const baseName = path.basename(filename);

  if (baseName !== filename) {
    return null;
  }

  if (kind === "photo" && !isPhotoFile(baseName)) {
    return null;
  }

  if (kind === "video" && getExtension(baseName) !== ".mp4") {
    return null;
  }

  const directory = getMediaDirectory(kind);
  const filePath = path.join(directory, baseName);

  if (!filePath.startsWith(`${directory}${path.sep}`)) {
    return null;
  }

  return filePath;
}

function titleFromVideo(filename: string, index: number) {
  const base = filename.replace(/\.mp4$/i, "");
  const handleMatch = base.match(/@([A-Za-z0-9_.]+)/);

  if (handleMatch?.[1]) {
    return `@${handleMatch[1].replace(/_+$/, "")}`;
  }

  return `Video ${index + 1}`;
}

export async function syncMediaDirectory() {
  await Promise.all([mkdir(contentDir, { recursive: true }), mkdir(photoDir, { recursive: true })]);

  const [videoEntries, photoEntries] = await Promise.all([
    readdir(contentDir).catch(() => [] as string[]),
    readdir(photoDir).catch(() => [] as string[]),
  ]);
  const videos = videoEntries
    .filter((entry) => entry.toLowerCase().endsWith(".mp4"))
    .sort((a, b) => a.localeCompare(b, "en"));
  const photos = photoEntries.filter(isPhotoFile).sort((a, b) => a.localeCompare(b, "en"));

  let synced = 0;

  for (const [index, filename] of videos.entries()) {
    await prisma.media.upsert({
      create: {
        filename,
        src: mediaSrcForFilename("video", filename),
        title: titleFromVideo(filename, index),
        type: "VIDEO",
      },
      update: {
        src: mediaSrcForFilename("video", filename),
        type: "VIDEO",
      },
      where: { filename },
    });
    synced += 1;
  }

  for (const [index, filename] of photos.entries()) {
    await prisma.media.upsert({
      create: {
        filename,
        src: mediaSrcForFilename("photo", filename),
        title: `Foto ${index + 1}`,
        type: "PHOTO",
      },
      update: {
        src: mediaSrcForFilename("photo", filename),
        type: "PHOTO",
      },
      where: { filename },
    });
    synced += 1;
  }

  return { synced };
}

export async function storeUploadedMedia(file: File, title?: string) {
  const kind = detectMediaKind(file.name, file.type);

  if (!kind) {
    throw new Error("Unsupported media type");
  }

  const maxSize = kind === "photo" ? maxPhotoSize : maxVideoSize;

  if (file.size > maxSize) {
    throw new Error(`File is larger than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  const filename = safeStoredFilename(file.name);
  const directory = getMediaDirectory(kind);
  const filePath = path.join(directory, filename);

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });

  return prisma.media.create({
    data: {
      filename,
      src: mediaSrcForFilename(kind, filename),
      title: title?.trim() || (kind === "photo" ? "Foto baru" : "Video baru"),
      type: kind === "photo" ? "PHOTO" : "VIDEO",
    },
  });
}

export async function deleteMediaFile(kind: UploadedMediaKind, filename: string) {
  const filePath = safeExistingMediaPath(kind, filename);

  if (!filePath) {
    return { deleted: false, warning: "Invalid file path" };
  }

  try {
    await stat(filePath);
    await unlink(filePath);
    return { deleted: true, warning: null };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return { deleted: false, warning: "File did not exist" };
    }

    throw error;
  }
}

export function mediaKindFromType(type: "PHOTO" | "VIDEO"): UploadedMediaKind {
  return type === "PHOTO" ? "photo" : "video";
}

export function contentTypeForMedia(filename: string) {
  return isPhotoFile(filename) ? getPhotoContentType(filename) : "video/mp4";
}
