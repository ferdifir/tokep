import { getLimit, getPhotoPage } from "@/lib/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 12);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const page = await getPhotoPage(limit, cursor);

  return Response.json(page);
}
