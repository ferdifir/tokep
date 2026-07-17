import { analyzeServiceContent } from "@/lib/service-ai";
import { notifyAdmin } from "@/lib/admin-notify";
import { prisma } from "@/lib/db";
import { getServiceReportFlagThreshold } from "@/lib/env";
import type {
  ServiceClaim,
  ServiceClaimStatus,
  ServiceListing,
  ServiceRecommendation,
  ServiceStatus,
  ServiceReportReason,
} from "@/lib/generated/prisma/client";

export type ServiceCatalogItem = {
  category: string;
  claimStatus: "none" | "pending" | "approved" | "disputed";
  contactAvailable: boolean;
  description: string;
  id: string;
  initials: string;
  isOwner: boolean;
  location: string;
  name: string;
  qualityLabel: string;
  recommendations: number;
  reportCount: number;
  review: string;
  reviews: number;
  status: "active" | "flagged" | "restricted";
  tags: string[];
  title: string;
  verified: boolean;
};

export type ServiceReviewItem = {
  createdAt: string;
  id: string;
  review: string;
  tags: string[];
  username: string;
};

export type AdminServiceQueue = Awaited<ReturnType<typeof getAdminServiceQueue>>;

type ListingWithRelations = ServiceListing & {
  claims?: Pick<ServiceClaim, "status">[];
  recommendations?: Array<
    Pick<ServiceRecommendation, "createdAt" | "id" | "review" | "tags"> & {
      user?: {
        firstName: string | null;
        username: string | null;
      };
    }
  >;
};

function serviceStatusToUi(status: ServiceStatus) {
  if (status === "FLAGGED") {
    return "flagged";
  }

  if (status === "RESTRICTED") {
    return "restricted";
  }

  return "active";
}

function claimStatusToUi(claims?: Pick<ServiceClaim, "status">[]) {
  const status = claims?.[0]?.status;

  if (status === "APPROVED") {
    return "approved";
  }

  if (status === "DISPUTED") {
    return "disputed";
  }

  if (status === "PENDING") {
    return "pending";
  }

  return "none";
}

export function initialsFromName(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "JS"
  );
}

function listingToCatalogItem(
  listing: ListingWithRelations,
  viewerUserId?: string | null,
): ServiceCatalogItem {
  return {
    category: listing.category,
    claimStatus: claimStatusToUi(listing.claims),
    contactAvailable: Boolean(listing.contact) && listing.ownerId !== viewerUserId,
    description: listing.description,
    id: listing.id,
    initials: listing.initials,
    isOwner: Boolean(viewerUserId && listing.ownerId === viewerUserId),
    location: listing.location,
    name: listing.providerName,
    qualityLabel: listing.qualityLabel ?? "Belum cukup sinyal",
    recommendations: listing.recommendationCount,
    reportCount: listing.reportCount,
    review:
      listing.aiSummary ??
      listing.recommendations?.[0]?.review ??
      "Jasa ini belum punya review tertulis.",
    reviews: listing.reviewCount,
    status: serviceStatusToUi(listing.status),
    tags: listing.tags,
    title: listing.title,
    verified: listing.verified,
  };
}

function reviewToItem(
  recommendation: NonNullable<ListingWithRelations["recommendations"]>[number],
): ServiceReviewItem {
  return {
    createdAt: recommendation.createdAt.toISOString(),
    id: recommendation.id,
    review: recommendation.review ?? "Pengguna ini memberi rekomendasi.",
    tags: recommendation.tags,
    username:
      recommendation.user?.username ??
      recommendation.user?.firstName ??
      "Pengguna Telegram",
  };
}

export async function getServiceCategories() {
  const rows = await prisma.serviceListing.findMany({
    distinct: ["category"],
    orderBy: { category: "asc" },
    select: { category: true },
    where: {
      status: {
        not: "HIDDEN",
      },
    },
  });
  const categories = rows.map((row) => row.category).filter(Boolean);

  return ["Semua", ...categories];
}

export async function getServicePage({
  category,
  cursor,
  limit = 12,
  viewerUserId,
}: {
  category?: string | null;
  cursor?: string | null;
  limit?: number;
  viewerUserId?: string | null;
}) {
  const rows = await prisma.serviceListing.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      claims: viewerUserId
        ? {
            orderBy: { createdAt: "desc" },
            select: { status: true },
            take: 1,
            where: { userId: viewerUserId },
          }
        : false,
      recommendations: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true, review: true, tags: true },
        take: 1,
        where: {
          review: {
            not: null,
          },
        },
      },
    },
    orderBy: { id: "desc" },
    skip: cursor ? 1 : 0,
    take: limit + 1,
    where: {
      ...(category && category !== "Semua" ? { category } : {}),
      status: {
        not: "HIDDEN",
      },
    },
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map((item) => listingToCatalogItem(item, viewerUserId)),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}

export async function getServiceDetail({
  id,
  viewerUserId,
}: {
  id: string;
  viewerUserId?: string | null;
}) {
  const listing = await prisma.serviceListing.findUnique({
    include: {
      claims: viewerUserId
        ? {
            orderBy: { createdAt: "desc" },
            select: { status: true },
            take: 1,
            where: { userId: viewerUserId },
          }
        : false,
      recommendations: {
        include: {
          user: {
            select: {
              firstName: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
    where: {
      id,
      status: {
        not: "HIDDEN",
      },
    },
  });

  if (!listing) {
    return null;
  }

  return {
    item: listingToCatalogItem(listing, viewerUserId),
    reviews: listing.recommendations.map(reviewToItem),
  };
}

export async function createServiceListing({
  contact,
  description,
  isOwner,
  location,
  providerName,
  title,
  userId,
}: {
  contact?: string | null;
  description: string;
  isOwner: boolean;
  location: string;
  providerName: string;
  title: string;
  userId: string;
}) {
  const ai = await analyzeServiceContent({ description, title });
  const listing = await prisma.serviceListing.create({
    data: {
      aiSummary: ai.summary,
      category: ai.category,
      contact,
      description,
      initials: initialsFromName(providerName),
      location,
      ownerId: isOwner ? userId : null,
      providerName,
      qualityLabel: ai.qualityLabel,
      recommendationCount: 0,
      reviewCount: 0,
      submittedById: userId,
      tags: ai.tags,
      title,
      verified: false,
    },
    include: {
      claims: false,
      recommendations: {
        select: { createdAt: true, id: true, review: true, tags: true },
        take: 1,
      },
    },
  });

  await notifyAdmin(
    [
      "Tokep admin: listing jasa baru perlu review.",
      `${listing.title} - ${listing.providerName}`,
      `Lokasi: ${listing.location}`,
      `Status pemilik: ${isOwner ? "dibuat pemilik" : "rekomendasi user"}`,
    ].join("\n"),
  );

  return listingToCatalogItem(listing, userId);
}

export async function recommendServiceListing({
  listingId,
  review,
  tags,
  userId,
}: {
  listingId: string;
  review?: string | null;
  tags?: string[];
  userId: string;
}) {
  const current = await prisma.serviceListing.findUniqueOrThrow({
    where: { id: listingId },
  });
  const ai = await analyzeServiceContent({
    description: current.description,
    review,
    title: current.title,
  });
  const existing = await prisma.serviceRecommendation.findFirst({
    where: {
      listingId,
      userId,
    },
  });

  if (existing) {
    await prisma.serviceRecommendation.update({
      data: {
        review,
        tags: tags?.length ? tags : ai.tags,
      },
      where: { id: existing.id },
    });
  } else {
    await prisma.serviceRecommendation.create({
      data: {
        listingId,
        review,
        tags: tags?.length ? tags : ai.tags,
        userId,
      },
    });
  }

  const reviewCount = await prisma.serviceRecommendation.count({
    where: {
      listingId,
      review: {
        not: null,
      },
    },
  });
  const recommendationCount = await prisma.serviceRecommendation.count({
    where: {
      listingId,
    },
  });
  const mergedTags = [...new Set([...current.tags, ...ai.tags])].slice(0, 8);
  const updated = await prisma.serviceListing.update({
    data: {
      aiSummary: ai.summary,
      category: ai.category,
      qualityLabel: ai.qualityLabel,
      recommendationCount,
      reviewCount,
      tags: mergedTags,
    },
    include: {
      claims: {
        orderBy: { createdAt: "desc" },
        select: { status: true },
        take: 1,
        where: { userId },
      },
      recommendations: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true, review: true, tags: true },
        take: 1,
      },
    },
    where: { id: listingId },
  });

  return listingToCatalogItem(updated, userId);
}

export async function reportServiceListing({
  detail,
  listingId,
  reason,
  userId,
}: {
  detail?: string | null;
  listingId: string;
  reason: ServiceReportReason;
  userId: string;
}) {
  const existing = await prisma.serviceReport.findFirst({
    where: {
      listingId,
      userId,
    },
  });

  if (existing) {
    await prisma.serviceReport.update({
      data: {
        adminNote: null,
        detail,
        reason,
        reviewedAt: null,
      },
      where: { id: existing.id },
    });
  } else {
    await prisma.serviceReport.create({
      data: {
        detail,
        listingId,
        reason,
        userId,
      },
    });
  }

  const reportCount = await prisma.serviceReport.count({ where: { listingId } });
  const status = reportCount >= getServiceReportFlagThreshold() ? "FLAGGED" : undefined;
  const updated = await prisma.serviceListing.update({
    data: {
      reportCount,
      ...(status ? { status } : {}),
    },
    include: {
      claims: {
        orderBy: { createdAt: "desc" },
        select: { status: true },
        take: 1,
        where: { userId },
      },
      recommendations: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true, review: true, tags: true },
        take: 1,
      },
    },
    where: { id: listingId },
  });

  if (status || reason === "SUSPECTED_FRAUD") {
    await notifyAdmin(
      [
        "Tokep admin: laporan jasa perlu review.",
        `${updated.title} - ${updated.providerName}`,
        `Alasan: ${reason}`,
        `Total laporan unik: ${reportCount}`,
        `Status listing: ${updated.status}`,
      ].join("\n"),
    );
  }

  return listingToCatalogItem(updated, userId);
}

export async function claimServiceListing({
  evidence,
  listingId,
  method,
  userId,
}: {
  evidence?: string | null;
  listingId: string;
  method: string;
  userId: string;
}) {
  const listing = await prisma.serviceListing.findUniqueOrThrow({
    where: { id: listingId },
  });
  const status =
    listing.ownerId && listing.ownerId !== userId ? "DISPUTED" : "PENDING";

  const existing = await prisma.serviceClaim.findFirst({
    where: {
      listingId,
      userId,
    },
  });

  if (existing) {
    await prisma.serviceClaim.update({
      data: {
        evidence,
        method,
        status,
      },
      where: { id: existing.id },
    });
  } else {
    await prisma.serviceClaim.create({
      data: {
        evidence,
        listingId,
        method,
        status,
        userId,
      },
    });
  }

  const updated = await prisma.serviceListing.findUniqueOrThrow({
    include: {
      claims: {
        orderBy: { createdAt: "desc" },
        select: { status: true },
        take: 1,
        where: { userId },
      },
      recommendations: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true, review: true, tags: true },
        take: 1,
      },
    },
    where: { id: listingId },
  });

  await notifyAdmin(
    [
      "Tokep admin: klaim listing perlu review.",
      `${updated.title} - ${updated.providerName}`,
      `Status klaim: ${status}`,
      `Metode: ${method}`,
      evidence ? `Bukti: ${evidence}` : "Bukti: belum diisi",
    ].join("\n"),
  );

  return listingToCatalogItem(updated, userId);
}

export async function getAdminServiceQueue() {
  const [listings, claims, reports] = await Promise.all([
    prisma.serviceListing.findMany({
      include: {
        owner: {
          select: { firstName: true, username: true },
        },
        submittedBy: {
          select: { firstName: true, username: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      where: {
        OR: [
          { verified: false },
          { status: { in: ["FLAGGED", "RESTRICTED"] } },
        ],
      },
    }),
    prisma.serviceClaim.findMany({
      include: {
        listing: true,
        user: {
          select: { firstName: true, username: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
      where: {
        status: {
          in: ["PENDING", "DISPUTED"],
        },
      },
    }),
    prisma.serviceReport.findMany({
      include: {
        listing: true,
        user: {
          select: { firstName: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      where: {
        reviewedAt: null,
      },
    }),
  ]);

  return { claims, listings, reports };
}

export async function updateAdminServiceListing({
  listingId,
  status,
  verified,
}: {
  listingId: string;
  status?: ServiceStatus;
  verified?: boolean;
}) {
  return prisma.serviceListing.update({
    data: {
      ...(status ? { status } : {}),
      ...(typeof verified === "boolean" ? { verified } : {}),
    },
    where: { id: listingId },
  });
}

export async function reviewAdminServiceReport({
  adminNote,
  reportId,
  status,
}: {
  adminNote?: string | null;
  reportId: string;
  status?: ServiceStatus;
}) {
  const report = await prisma.serviceReport.update({
    data: {
      adminNote,
      reviewedAt: new Date(),
    },
    include: {
      listing: true,
    },
    where: { id: reportId },
  });

  if (status) {
    await prisma.serviceListing.update({
      data: { status },
      where: { id: report.listingId },
    });
  }

  return report;
}

export async function reviewAdminServiceClaim({
  adminNote,
  claimId,
  status,
}: {
  adminNote?: string | null;
  claimId: string;
  status: ServiceClaimStatus;
}) {
  const claim = await prisma.serviceClaim.update({
    data: {
      adminNote,
      status,
    },
    include: {
      listing: true,
      user: {
        select: {
          firstName: true,
          id: true,
          username: true,
        },
      },
    },
    where: { id: claimId },
  });

  if (status === "APPROVED") {
    await prisma.serviceListing.update({
      data: {
        ownerId: claim.userId,
        verified: true,
      },
      where: { id: claim.listingId },
    });
  }

  return claim;
}
