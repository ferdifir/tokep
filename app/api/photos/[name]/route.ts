import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { photoDir } from "@/lib/media-paths";
import { getPhotoContentType, isPhotoFile } from "@/lib/photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safePhotoPath(name: string) {
  const decodedName = decodeURIComponent(name);
  const baseName = path.basename(decodedName);

  if (baseName !== decodedName || !isPhotoFile(baseName)) {
    return null;
  }

  const filePath = path.join(/* turbopackIgnore: true */ photoDir, baseName);

  if (!filePath.startsWith(`${photoDir}${path.sep}`)) {
    return null;
  }

  return { filePath, baseName };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const photo = safePhotoPath(name);

  if (!photo) {
    return new Response("Invalid photo path", { status: 400 });
  }

  try {
    const fileStat = await stat(photo.filePath);
    const stream = createReadStream(photo.filePath);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileStat.size),
        "Content-Type": getPhotoContentType(photo.baseName),
      },
    });
  } catch {
    return new Response("Photo not found", { status: 404 });
  }
}
