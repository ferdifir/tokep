import { adminCookieHeader, verifyAdminOtp } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim();

  if (!code || !/^\d{6}$/.test(code)) {
    return Response.json({ error: "OTP harus 6 digit" }, { status: 400 });
  }

  const verified = await verifyAdminOtp(code);

  if (!verified) {
    return Response.json({ error: "OTP salah atau kedaluwarsa" }, { status: 401 });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": adminCookieHeader(
          verified.token,
          verified.session.expiresAt,
        ),
      },
    },
  );
}
