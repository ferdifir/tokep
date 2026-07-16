import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { videoDir } from "@/lib/media-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MP4_HEADERS = {
  "Content-Type": "video/mp4",
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=31536000, immutable",
};

function safeVideoPath(name: string) {
  const decodedName = decodeURIComponent(name);
  const baseName = path.basename(decodedName);

  if (baseName !== decodedName || !baseName.toLowerCase().endsWith(".mp4")) {
    return null;
  }

  const filePath = path.join(/* turbopackIgnore: true */ videoDir, baseName);

  if (!filePath.startsWith(`${videoDir}${path.sep}`)) {
    return null;
  }

  return filePath;
}

function parseRange(range: string | null, size: number) {
  if (!range) {
    return null;
  }

  const match = range.match(/^bytes=(\d*)-(\d*)$/);

  if (!match) {
    return null;
  }

  const startText = match[1];
  const endText = match[2];

  if (!startText && !endText) {
    return null;
  }

  if (!startText) {
    const suffixLength = Number(endText);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }

    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    };
  }

  const start = Number(startText);
  const end = endText ? Number(endText) : size - 1;

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(end, size - 1),
  };
}

function streamVideo(filePath: string, start?: number, end?: number) {
  return Readable.toWeb(
    createReadStream(filePath, {
      ...(typeof start === "number" ? { start } : {}),
      ...(typeof end === "number" ? { end } : {}),
    }),
  ) as ReadableStream;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const filePath = safeVideoPath(name);

  if (!filePath) {
    return new Response("Invalid video path", { status: 400 });
  }

  try {
    const fileStat = await stat(filePath);
    const requestedRange = request.headers.get("range");
    const range = parseRange(requestedRange, fileStat.size);

    if (requestedRange && !range) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: {
          ...MP4_HEADERS,
          "Content-Range": `bytes */${fileStat.size}`,
        },
      });
    }

    if (!range) {
      return new Response(streamVideo(filePath), {
        status: 200,
        headers: {
          ...MP4_HEADERS,
          "Content-Length": String(fileStat.size),
        },
      });
    }

    const chunkSize = range.end - range.start + 1;

    return new Response(streamVideo(filePath, range.start, range.end), {
      status: 206,
      headers: {
        ...MP4_HEADERS,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${range.start}-${range.end}/${fileStat.size}`,
      },
    });
  } catch {
    return new Response("Video not found", { status: 404 });
  }
}
