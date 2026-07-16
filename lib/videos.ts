import { readdir } from "node:fs/promises";
import path from "node:path";

export type FeedVideo = {
  id: string;
  filename: string;
  src: string;
  title: string;
};

export const contentDir = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "konten",
);

function titleFromFilename(filename: string, index: number) {
  const base = filename.replace(/\.mp4$/i, "");
  const handleMatch = base.match(/@([A-Za-z0-9_.]+)/);

  if (handleMatch?.[1]) {
    return `@${handleMatch[1].replace(/_+$/, "")}`;
  }

  return `Video ${index + 1}`;
}

export async function getFeedVideos(): Promise<FeedVideo[]> {
  let entries: string[];

  try {
    entries = await readdir(contentDir);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.toLowerCase().endsWith(".mp4"))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((filename, index) => ({
      id: `${index + 1}-${filename}`,
      filename,
      src: `/api/videos/${encodeURIComponent(filename)}`,
      title: titleFromFilename(filename, index),
    }));
}
