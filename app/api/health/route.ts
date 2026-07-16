import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [mediaCount, userCount] = await Promise.all([
    prisma.media.count(),
    prisma.user.count(),
  ]);

  return Response.json({
    ok: true,
    mediaCount,
    userCount,
  });
}
