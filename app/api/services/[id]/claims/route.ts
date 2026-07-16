import { claimServiceListing } from "@/lib/service-store";
import {
  getOrCreateRequestUser,
  telegramAuthErrorResponse,
} from "@/lib/telegram-auth";
import { requireRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateRequestUser(request);
    const limited = await requireRateLimit({
      key: `service-claim:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (limited) {
      return limited;
    }

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
  } catch (error) {
    const authResponse = telegramAuthErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    throw error;
  }
}
