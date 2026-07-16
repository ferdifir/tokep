import { claimServiceListing } from "@/lib/service-store";
import { getOrCreateRequestUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getOrCreateRequestUser(request);
  const { id } = await params;
  const body = (await request.json()) as {
    evidence?: string;
    method?: string;
  };

  if (!body.method) {
    return Response.json({ error: "Metode klaim wajib dipilih" }, { status: 400 });
  }

  const item = await claimServiceListing({
    evidence: body.evidence?.trim() || null,
    listingId: id,
    method: body.method,
    userId: user.id,
  });

  return Response.json({ item });
}
