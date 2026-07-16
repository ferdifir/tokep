"use client";

import { savedMediaChangedEvent } from "@/app/components/save-button";
import { Play } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type SavedMediaItem = {
  filename: string;
  id: string;
  saveId: string;
  src: string;
  title: string;
  type: "photo" | "video";
};

type SavedPage = {
  items: SavedMediaItem[];
  nextCursor: string | null;
};

function telegramHeaders() {
  const initData = window.Telegram?.WebApp?.initData ?? "";

  return initData ? { "x-telegram-init-data": initData } : ({} as Record<string, string>);
}

export function ProfileSavedGrid() {
  const [items, setItems] = useState<SavedMediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (cursor?: string | null, replace = false) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const params = new URLSearchParams({ limit: "18" });

    if (cursor) {
      params.set("cursor", cursor);
    }

    const response = await fetch(`/api/saved?${params}`, {
      headers: telegramHeaders(),
    });

    if (response.ok) {
      const page = (await response.json()) as SavedPage;

      setItems((current) => {
        const nextItems = replace ? page.items : [...current, ...page.items];
        const byId = new Map(nextItems.map((item) => [item.id, item]));

        return [...byId.values()];
      });
      setNextCursor(page.nextCursor);
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage(null, true);
    }, 0);

    const refresh = () => void loadPage(null, true);

    window.addEventListener(savedMediaChangedEvent, refresh);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(savedMediaChangedEvent, refresh);
    };
  }, [loadPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !nextCursor) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loadingMore) {
          void loadPage(nextCursor);
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loadPage, loadingMore, nextCursor]);

  if (loading) {
    return (
      <div className="grid min-h-40 place-items-center text-sm text-white/55">
        Memuat konten tersimpan...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-md border border-white/10 px-5 text-center text-sm leading-6 text-white/55">
        Konten yang disimpan akan muncul di sini.
      </div>
    );
  }

  return (
    <>
      <div className="columns-3 gap-1.5 [column-fill:_balance]">
        {items.map((item) => (
          <figure
            className="mb-1.5 break-inside-avoid overflow-hidden rounded-md bg-zinc-900"
            key={item.id}
          >
            <Link
              aria-label={`Buka ${item.title}`}
              className="relative block"
              href={`/media/${encodeURIComponent(item.filename)}`}
            >
              {item.type === "photo" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.title}
                    className="h-auto w-full object-cover"
                    decoding="async"
                    loading="lazy"
                    src={item.src}
                  />
                </>
              ) : (
                <>
                  <video
                    aria-label={item.title}
                    className="h-auto w-full object-cover"
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    src={item.src}
                  />
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                      <Play
                        aria-hidden="true"
                        className="ml-0.5"
                        fill="currentColor"
                        size={18}
                        strokeWidth={2.2}
                      />
                    </span>
                  </span>
                </>
              )}
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
