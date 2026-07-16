import { requireAdmin } from "@/lib/admin-auth";
import { getAdminServiceQueue } from "@/lib/service-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queue = await getAdminServiceQueue();

  return Response.json(queue);
}
