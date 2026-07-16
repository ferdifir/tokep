import { getAdminAuditPage } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { getLimit } from "@/lib/media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 40);
  const cursor = url.searchParams.get("cursor");
  const page = await getAdminAuditPage({ cursor, limit });

  return Response.json(page);
}
