import { recommendServiceListing } from "@/lib/service-store";
import {
  getOrCreateRequestUser,
  telegramAuthErrorResponse,
} from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrCreateRequestUser(request);
    const { id } = await params;
    const body = (await request.json()) as {
      review?: string;
      tags?: string[];
    };

    const item = await recommendServiceListing({
      listingId: id,
      review: body.review?.trim() || null,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 6) : [],
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
