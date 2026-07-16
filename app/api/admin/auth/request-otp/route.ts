import { createAdminOtp } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
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
