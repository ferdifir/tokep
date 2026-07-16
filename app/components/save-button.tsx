"use client";

import { Bookmark } from "lucide-react";
import { MouseEvent, useEffect, useState } from "react";

export const savedMediaChangedEvent = "tokep:saved-media-changed";

function telegramHeaders() {
  const initData = window.Telegram?.WebApp?.initData ?? "";

  return initData ? { "x-telegram-init-data": initData } : ({} as Record<string, string>);
}

export function SaveButton({
  className = "",
  mediaId,
}: {
  className?: string;
  mediaId: string;
}) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadSavedStatus() {
      const response = await fetch(
        `/api/saved/status?mediaId=${encodeURIComponent(mediaId)}`,
        {
          headers: telegramHeaders(),
        },
      );

      if (!response.ok || ignore) {
        return;
      }

      const data = (await response.json()) as { saved: boolean };
      setSaved(data.saved);
    }

    void loadSavedStatus();

    return () => {
      ignore = true;
    };
  }, [mediaId]);

  const toggleSaved = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (pending) {
      return;
    }

    const nextSaved = !saved;

    setSaved(nextSaved);
    setPending(true);

    const response = await fetch(
      nextSaved
        ? "/api/saved"
        : `/api/saved?mediaId=${encodeURIComponent(mediaId)}`,
      {
        body: nextSaved ? JSON.stringify({ mediaId }) : undefined,
        headers: {
          "Content-Type": "application/json",
          ...telegramHeaders(),
        },
        method: nextSaved ? "POST" : "DELETE",
      },
    );

    if (!response.ok) {
      setSaved(!nextSaved);
    } else {
      window.dispatchEvent(new Event(savedMediaChangedEvent));
    }

    setPending(false);
  };

  return (
    <button
      aria-label={saved ? "Unsave media" : "Save media"}
      aria-pressed={saved}
      className={`grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/60 active:scale-95 disabled:opacity-60 ${className}`}
      disabled={pending}
      onClick={toggleSaved}
      type="button"
    >
      <Bookmark
        aria-hidden="true"
        fill={saved ? "currentColor" : "none"}
        size={22}
        strokeWidth={2.4}
      />
    </button>
  );
}
