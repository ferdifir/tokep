import {
  createServiceListing,
  getServicePage,
} from "@/lib/service-store";
import { getLimit } from "@/lib/media-store";
import {
  getOptionalRequestUser,
  getOrCreateRequestUser,
  telegramAuthErrorResponse,
} from "@/lib/telegram-auth";
import { requireRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 12);
  const cursor = url.searchParams.get("cursor");
  const category = url.searchParams.get("category");
  const viewer = await getOptionalRequestUser(request);
  const page = await getServicePage({
    category,
    cursor,
    limit,
    viewerUserId: viewer?.id,
  });

  return Response.json(page);
}

export async function POST(request: Request) {
  try {
    const user = await getOrCreateRequestUser(request);
    const limited = await requireRateLimit({
      key: `service-create:${user.id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as {
      contact?: string;
      description?: string;
      isOwner?: boolean;
      location?: string;
      name?: string;
      title?: string;
    };

    if (!body.name || !body.title || !body.location || !body.description) {
      return Response.json({ error: "Data jasa belum lengkap" }, { status: 400 });
    }

    const item = await createServiceListing({
      contact: body.contact?.trim() || null,
      description: body.description.trim(),
      isOwner: Boolean(body.isOwner),
      location: body.location.trim(),
      providerName: body.name.trim(),
      title: body.title.trim(),
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
