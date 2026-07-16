"use client";

import { SaveButton } from "@/app/components/save-button";
import { recordMediaViewEvent } from "@/lib/client-media-events";
import { ChevronLeft, Play, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PreviewMedia = {
  id: string;
  src: string;
  title: string;
  type: "PHOTO" | "VIDEO";
};

export function MediaPreview({ media }: { media: PreviewMedia }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(true);
  const [loading, setLoading] = useState(media.type === "VIDEO");

  useEffect(() => {
    recordMediaViewEvent({
      completed: media.type === "PHOTO",
      durationMs: media.type === "PHOTO" ? 1000 : undefined,
      mediaId: media.id,
    });
  }, [media.id, media.type]);

  useEffect(() => {
    const video = videoRef.current;

    if (media.type !== "VIDEO" || !video) {
      return;
    }

    video.muted = true;

    void video
      .play()
      .then(() => setPaused(false))
      .catch(() => setPaused(true));
  }, [media.type, media.src]);

  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const toggleMuted = () => {
    setMuted((current) => !current);
  };

  return (
    <main className="relative flex h-dvh items-center justify-center overflow-hidden bg-black text-white">
      <Link
        aria-label="Kembali ke profil"
        className="absolute left-[calc(env(safe-area-inset-left)+1rem)] top-[calc(env(safe-area-inset-top)+1rem)] z-40 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/60 active:scale-95"
        href="/profil"
      >
        <ChevronLeft aria-hidden="true" size={24} strokeWidth={2.5} />
      </Link>

      {media.type === "PHOTO" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={media.title}
          className="max-h-full w-full object-contain"
          decoding="async"
          src={media.src}
        />
      ) : (
        <button
          aria-label={paused ? "Play video" : "Pause video"}
          className="relative h-full w-full touch-manipulation"
          onClick={togglePlayback}
          type="button"
        >
          <video
            className="h-full w-full bg-black object-contain"
            loop
            muted={muted}
            onCanPlay={() => setLoading(false)}
            onEnded={() =>
              recordMediaViewEvent({
                completed: true,
                durationMs: Math.round(
                  (videoRef.current?.duration ?? 0) * 1000,
                ),
                mediaId: media.id,
              })
            }
            onLoadedMetadata={() => setLoading(false)}
            onPause={() => setPaused(true)}
            onPlay={() => setPaused(false)}
            playsInline
            preload="auto"
            ref={videoRef}
            src={media.src}
          >
            Browser ini tidak mendukung video.
          </video>

          {loading ? (
            <span className="absolute inset-0 grid place-items-center bg-black/25">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            </span>
          ) : null}

          {paused ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-black/40 text-white shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur-md">
                <Play
                  aria-hidden="true"
                  className="ml-1"
                  fill="currentColor"
                  size={30}
                  strokeWidth={2.2}
                />
              </span>
            </span>
          ) : null}
        </button>
      )}

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-[calc(env(safe-area-inset-right)+1rem)] z-40 flex flex-col gap-3">
        <SaveButton mediaId={media.id} />
        {media.type === "VIDEO" ? (
          <button
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/60 active:scale-95"
            onClick={toggleMuted}
            type="button"
          >
            {muted ? (
              <VolumeX aria-hidden="true" size={22} strokeWidth={2.4} />
            ) : (
              <Volume2 aria-hidden="true" size={22} strokeWidth={2.4} />
            )}
          </button>
        ) : null}
      </div>
    </main>
  );
}
