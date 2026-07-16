import { SaveButton } from "@/app/components/save-button";
import { prisma } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function decodeName(name: string) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export default async function PhotoPreviewPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const filename = decodeName(name);
  const photo = await prisma.media.findUnique({
    where: { filename },
  });

  if (!photo || photo.type !== "PHOTO") {
    notFound();
  }

  return (
    <main className="relative flex h-dvh items-center justify-center overflow-hidden bg-black text-white">
      <Link
        aria-label="Kembali ke foto"
        className="absolute left-[calc(env(safe-area-inset-left)+1rem)] top-[calc(env(safe-area-inset-top)+1rem)] z-40 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/60 active:scale-95"
        href="/foto"
      >
        <ChevronLeft aria-hidden="true" size={24} strokeWidth={2.5} />
      </Link>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={photo.title}
        className="max-h-full w-full object-contain"
        decoding="async"
        src={photo.src}
      />

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-[calc(env(safe-area-inset-right)+1rem)] z-40">
        <SaveButton mediaId={photo.id} />
      </div>
    </main>
  );
}
