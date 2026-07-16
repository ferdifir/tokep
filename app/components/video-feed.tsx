"use client";

import type { FeedVideo } from "@/lib/videos";
import { SaveButton } from "@/app/components/save-button";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VideoFit = "cover" | "contain";

type VideoState = {
  fit: VideoFit;
  loading: boolean;
  error: boolean;
  progress: number;
  paused: boolean;
};

const defaultState: VideoState = {
  fit: "cover",
  loading: true,
  error: false,
  progress: 0,
  paused: true,
};

function shouldContain(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight) {
    return false;
  }

  const ratio = video.videoWidth / video.videoHeight;

  return ratio > 0.9;
}

export function VideoFeed({
  initialNextCursor,
  initialVideos,
}: {
  initialNextCursor: string | null;
  initialVideos: FeedVideo[];
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [states, setStates] = useState<Record<string, VideoState>>({});
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const updateVideoState = useCallback(
    (id: string, nextState: Partial<VideoState>) => {
      setStates((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? defaultState),
          ...nextState,
        },
      }));
    },
    [],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!mostVisible) {
          return;
        }

        const index = Number(
          (mostVisible.target as HTMLElement).dataset.videoIndex,
        );

        if (Number.isInteger(index)) {
          setActiveIndex(index);
        }
      },
      {
        root: null,
        threshold: [0.55, 0.7, 0.85],
      },
    );

    itemRefs.current.forEach((item) => {
      if (item) {
        observer.observe(item);
      }
    });

    return () => observer.disconnect();
  }, [videos.length]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) {
        return;
      }

      video.muted = muted;

      if (index === activeIndex) {
        const playPromise = video.play();

        if (playPromise) {
          playPromise
            .then(() => {
              updateVideoState(videos[index].id, { paused: false });
            })
            .catch(() => {
              updateVideoState(videos[index].id, { paused: true });
            });
        }
      } else {
        video.pause();

        if (videos[index]) {
          updateVideoState(videos[index].id, { paused: true });
        }
      }
    });
  }, [activeIndex, muted, updateVideoState, videos]);

  const togglePlayback = (index: number) => {
    const video = videoRefs.current[index];
    const item = videos[index];

    if (!video || !item) {
      return;
    }

    if (video.paused) {
      void video.play().then(() => {
        updateVideoState(item.id, { paused: false });
      });
    } else {
      video.pause();
      updateVideoState(item.id, { paused: true });
    }
  };

  useEffect(() => {
    if (!nextCursor || loadingMore || activeIndex < videos.length - 3) {
      return;
    }

    async function loadMore() {
      const cursor = nextCursor;

      if (!cursor) {
        return;
      }

      setLoadingMore(true);

      const params = new URLSearchParams({
        cursor,
        limit: "5",
      });
      const response = await fetch(`/api/feed/videos?${params}`);

      if (response.ok) {
        const page = (await response.json()) as {
          items: FeedVideo[];
          nextCursor: string | null;
        };

        setVideos((current) => {
          const byId = new Map(
            [...current, ...page.items].map((item) => [item.id, item]),
          );

          return [...byId.values()];
        });
        setNextCursor(page.nextCursor);
      }

      setLoadingMore(false);
    }

    void loadMore();
  }, [activeIndex, loadingMore, nextCursor, videos.length]);

  if (videos.length === 0) {
    return (
      <main className="flex h-full items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Belum ada video</p>
          <p className="mt-2 text-sm text-white/60">
            Tambahkan file MP4 ke folder konten.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-y-auto overscroll-none bg-black text-white snap-y snap-mandatory">
      {videos.map((video, index) => {
        const state = states[video.id] ?? defaultState;
        const isActive = index === activeIndex;
        const shouldAttachSource = Math.abs(index - activeIndex) <= 1;
        const preload = isActive ? "auto" : "metadata";

        return (
          <section
            aria-label={video.title}
            className="relative flex h-full snap-start snap-always items-center justify-center overflow-hidden bg-black"
            data-video-index={index}
            key={video.id}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
          >
            {state.fit === "contain" && shouldAttachSource ? (
              <video
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
                loop
                muted
                playsInline
                preload="metadata"
                src={video.src}
              />
            ) : null}

            <button
              aria-label={state.paused ? "Play video" : "Pause video"}
              className="group relative z-10 h-full w-full cursor-pointer touch-manipulation"
              onClick={() => togglePlayback(index)}
              type="button"
            >
              {shouldAttachSource ? (
                <video
                  className={`h-full w-full bg-black ${
                    state.fit === "contain" ? "object-contain" : "object-cover"
                  }`}
                  loop
                  muted={muted}
                  onCanPlay={() =>
                    updateVideoState(video.id, { loading: false })
                  }
                  onError={() =>
                    updateVideoState(video.id, {
                      error: true,
                      loading: false,
                      paused: true,
                    })
                  }
                  onLoadedMetadata={(event) => {
                    const element = event.currentTarget;

                    updateVideoState(video.id, {
                      fit: shouldContain(element) ? "contain" : "cover",
                      loading: false,
                    });
                  }}
                  onPause={() => updateVideoState(video.id, { paused: true })}
                  onPlay={() => updateVideoState(video.id, { paused: false })}
                  onTimeUpdate={(event) => {
                    const element = event.currentTarget;
                    const progress = element.duration
                      ? (element.currentTime / element.duration) * 100
                      : 0;

                    updateVideoState(video.id, { progress });
                  }}
                  playsInline
                  preload={preload}
                  ref={(element) => {
                    videoRefs.current[index] = element;
                  }}
                  src={video.src}
                >
                  Browser ini tidak mendukung video.
                </video>
              ) : (
                <div className="h-full w-full bg-zinc-950" />
              )}

              {shouldAttachSource && state.loading && !state.error ? (
                <div className="absolute inset-0 grid place-items-center bg-black/25">
                  <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                </div>
              ) : null}

              {state.error ? (
                <div className="absolute inset-0 grid place-items-center bg-black/70 px-8 text-center">
                  <span className="text-sm font-medium text-white/80">
                    Video gagal dimuat
                  </span>
                </div>
              ) : null}

              {state.paused && isActive && !state.error ? (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-black/40 text-white shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur-md">
                    <Play
                      aria-hidden="true"
                      className="ml-1"
                      fill="currentColor"
                      size={30}
                      strokeWidth={2.2}
                    />
                  </span>
                </div>
              ) : null}
            </button>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-24">
              <div className="max-w-[80%]">
                <p className="text-sm font-semibold leading-5">{video.title}</p>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-white/15">
              <div
                className="h-full bg-white transition-[width] duration-150"
                style={{ width: `${state.progress}%` }}
              />
            </div>

            {isActive ? (
              <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-[calc(env(safe-area-inset-right)+1rem)] z-40 flex flex-col gap-3">
                <SaveButton mediaId={video.id} />
                <button
                  aria-label={muted ? "Unmute video" : "Mute video"}
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/60 active:scale-95"
                  onClick={() => setMuted((current) => !current)}
                  type="button"
                >
                  {muted ? (
                    <VolumeX aria-hidden="true" size={22} strokeWidth={2.4} />
                  ) : (
                    <Volume2 aria-hidden="true" size={22} strokeWidth={2.4} />
                  )}
                </button>
              </div>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}
