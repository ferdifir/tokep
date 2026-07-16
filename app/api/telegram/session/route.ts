import { syncTelegramUser } from "@/lib/telegram-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await syncTelegramUser(request);

  return Response.json({
    user: {
      bio: user.bio,
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      username: user.username,
    },
  });
}
