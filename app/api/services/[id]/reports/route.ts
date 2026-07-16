import { reportServiceListing } from "@/lib/service-store";
import {
  getOrCreateRequestUser,
  telegramAuthErrorResponse,
} from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedReasons = [
  "NO_SHOW",
  "PRICE_MISMATCH",
  "POOR_RESULT",
  "POOR_COMMUNICATION",
  "SUSPECTED_FRAUD",
  "OTHER",
] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateRequestUser(request);
    const { id } = await params;
    const body = (await request.json()) as {
      detail?: string;
      reason?: (typeof allowedReasons)[number];
    };
    const reason = allowedReasons.includes(body.reason ?? "OTHER")
      ? (body.reason ?? "OTHER")
      : "OTHER";
    const item = await reportServiceListing({
      detail: body.detail?.trim() || null,
      listingId: id,
      reason,
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
