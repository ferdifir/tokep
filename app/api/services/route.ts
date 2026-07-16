import {
  createServiceListing,
  ensureDemoServiceListings,
  getServicePage,
} from "@/lib/service-store";
import { getLimit } from "@/lib/media-store";
import { getOrCreateRequestUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDemoServiceListings();

  const url = new URL(request.url);
  const limit = getLimit(url.searchParams, 12);
  const cursor = url.searchParams.get("cursor");
  const category = url.searchParams.get("category");
  const page = await getServicePage({ category, cursor, limit });

  return Response.json(page);
}

export async function POST(request: Request) {
  const user = await getOrCreateRequestUser(request);
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
}
