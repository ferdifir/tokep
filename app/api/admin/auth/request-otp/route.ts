import { createAdminOtp } from "@/lib/admin-auth";
import { getClientIp, requireRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await requireRateLimit({
      key: `admin-otp:${getClientIp(request)}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (limited) {
      return limited;
    }

    const result = await createAdminOtp();

    return Response.json({
      debugCode: result.debugCode,
      sent: result.sent,
    });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
