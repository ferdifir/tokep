import { readdir } from "node:fs/promises";
import path from "node:path";
import { photoDir } from "@/lib/media-paths";

export type FeedPhoto = {
  id: string;
  filename: string;
  src: string;
  title: string;
};

const photoExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export function isPhotoFile(filename: string) {
  return photoExtensions.has(path.extname(filename).toLowerCase());
}

export function getPhotoContentType(filename: string) {
  switch (path.extname(filename).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

export async function getFeedPhotos(): Promise<FeedPhoto[]> {
  let entries: string[];

  try {
    entries = await readdir(photoDir);
  } catch {
    return [];
  }

  return entries
    .filter(isPhotoFile)
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((filename, index) => ({
      id: `${index + 1}-${filename}`,
      filename,
      src: `/api/photos/${encodeURIComponent(filename)}`,
      title: `Foto ${index + 1}`,
    }));
}
