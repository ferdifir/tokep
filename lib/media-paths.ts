import path from "node:path";

const contentRoot = process.env.TOKEP_CONTENT_DIR || "konten";

export const videoDir = path.resolve(/* turbopackIgnore: true */ contentRoot, "video");

export const photoDir = path.resolve(/* turbopackIgnore: true */ contentRoot, "foto");
