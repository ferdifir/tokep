"use client";

import type { FeedPhoto } from "@/lib/photos";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export function PhotoGrid({
  initialNextCursor,
  initialPhotos,
}: {
  initialNextCursor: string | null;
  initialPhotos: FeedPhoto[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);

    const params = new URLSearchParams({
      cursor: nextCursor,
      limit: "12",
    });
    const response = await fetch(`/api/feed/photos?${params}`);

    if (response.ok) {
      const page = (await response.json()) as {
        items: FeedPhoto[];
        nextCursor: string | null;
      };

      setPhotos((current) => {
        const byId = new Map(
          [...current, ...page.items].map((item) => [item.id, item]),
        );

        return [...byId.values()];
      });
      setNextCursor(page.nextCursor);
    }

    setLoadingMore(false);
  }, [loadingMore, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !nextCursor) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "500px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  if (photos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Belum ada foto</p>
          <p className="mt-2 text-sm text-white/60">
            Tambahkan file gambar ke folder konten/foto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-2 [column-fill:_balance]">
        {photos.map((photo) => (
          <figure className="mb-2 break-inside-avoid" key={photo.id}>
            <Link
              aria-label={`Buka ${photo.title}`}
              href={`/foto/${encodeURIComponent(photo.filename)}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={photo.title}
                className="h-auto w-full rounded-md bg-zinc-900 object-cover"
                decoding="async"
                loading="lazy"
                src={photo.src}
              />
            </Link>
          </figure>
        ))}
      </div>
      <div className="h-10" ref={sentinelRef}>
        {loadingMore ? (
          <p className="pt-3 text-center text-xs text-white/45">Memuat...</p>
        ) : null}
      </div>
    </>
  );
}
