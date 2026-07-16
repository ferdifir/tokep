import { MediaPreview } from "@/app/components/media-preview";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function decodeName(name: string) {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export default async function MediaPreviewPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const filename = decodeName(name);
  const media = await prisma.media.findUnique({
    where: { filename },
  });

  if (!media || !media.visible) {
    notFound();
  }

  return (
    <MediaPreview
      media={{
        id: media.id,
        src: media.src,
        title: media.title,
        type: media.type,
      }}
    />
  );
}
