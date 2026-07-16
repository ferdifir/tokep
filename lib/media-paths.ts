import path from "node:path";

const contentRoot = process.env.TOKEP_CONTENT_DIR || "konten";

export const contentDir = path.resolve(/* turbopackIgnore: true */ contentRoot);

export const photoDir = path.resolve(/* turbopackIgnore: true */ contentRoot, "foto");
