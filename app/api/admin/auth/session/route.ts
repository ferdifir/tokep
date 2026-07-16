import { clearAdminCookieHeader, getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAdminSession(request);

  return Response.json({
    authenticated: Boolean(session),
  });
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearAdminCookieHeader(),
      },
    },
  );
}
