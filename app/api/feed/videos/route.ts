import { getLimit, getVideoPage } from "@/lib/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 5);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const page = await getVideoPage(limit, cursor);

  return Response.json(page);
}
