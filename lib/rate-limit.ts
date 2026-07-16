import { prisma } from "@/lib/db";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  return prisma.$transaction(async (tx) => {
    const current = await tx.rateLimitBucket.findUnique({
      where: { key },
    });

    if (!current || current.resetAt <= now) {
      await tx.rateLimitBucket.upsert({
        create: {
          count: 1,
          key,
          resetAt,
        },
        update: {
          count: 1,
          resetAt,
        },
        where: { key },
      });

      return { allowed: true, retryAfterSeconds: 0 };
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt.getTime() - now.getTime()) / 1000),
    );

    if (current.count >= limit) {
      return { allowed: false, retryAfterSeconds };
    }

    await tx.rateLimitBucket.update({
      data: {
        count: {
          increment: 1,
        },
      },
      where: { key },
    });

    return { allowed: true, retryAfterSeconds: 0 };
  });
}

export async function requireRateLimit(options: RateLimitOptions) {
  const result = await checkRateLimit(options);

  if (result.allowed) {
    return null;
  }

  return Response.json(
    {
      error: "Terlalu banyak request. Coba lagi nanti.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
      status: 429,
    },
  );
}
