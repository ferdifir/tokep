import { getLimit, getVideoPage } from "@/lib/media-store";
import { getOptionalRequestUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 5);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const user = await getOptionalRequestUser(request);
  const page = await getVideoPage(limit, cursor, user?.id);

  return Response.json(page);
}
