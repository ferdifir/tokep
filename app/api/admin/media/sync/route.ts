import { requireAdmin } from "@/lib/admin-auth";
import { syncMediaDirectory } from "@/lib/server-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncMediaDirectory();

  return Response.json(result);
}
