# Telegram Mini App TikTok Feed MVP Design

## Goal

Build a fast Telegram Mini App MVP that feels like a TikTok-style vertical video feed using the existing local video files in `konten/`.

The first release is not a generic video player. It should prioritize fast feed navigation, reliable autoplay, and a polished full-screen browsing experience.

## Scope

Included:

- Full-screen vertical feed with one video per viewport.
- Scroll snap navigation similar to TikTok/Reels.
- Adaptive video fitting that respects each video's aspect ratio.
- Autoplay for the active video.
- Pause inactive videos to reduce CPU, battery, and network usage.
- Preload nearby videos so swiping feels quick.
- Minimal controls: tap play/pause, mute toggle, active progress, loading state.
- Local content discovery from the existing `konten/` MP4 files.
- Telegram-safe responsive layout, primarily mobile-first.

Excluded from MVP:

- Uploading videos.
- User accounts outside Telegram context.
- Likes, comments, sharing backend, recommendations, or analytics.
- Server-side transcoding.
- Infinite remote feed API.

## Recommended UX

Use the adaptive TikTok-style option:

- Vertical videos that match the device shape use a full-bleed `cover` presentation.
- Square or wide videos use `contain` so the video is not badly cropped.
- When `contain` is used, the same video can be shown behind it as a blurred, dimmed background to keep the screen immersive.

This keeps the TikTok feel for vertical content while preserving the original ratio for mixed-ratio videos.

## Architecture

The app stays within the existing Next.js App Router scaffold.

- `app/page.tsx` renders the feed shell.
- A client component owns scroll position, active item detection, autoplay, pause, mute, and preload behavior.
- A server-side helper or generated manifest lists the MP4 files from `konten/`.
- Video metadata passed to the client is simple: `id`, `src`, `title`, and filename-derived display data.

The `konten/` files need to be browser-addressable. The preferred MVP path is to expose them through a route handler or a static asset copy step without changing their source folder manually.

## Video Feed Behavior

Each feed item fills the visual viewport and uses CSS scroll snap.

Active item detection uses `IntersectionObserver` with a high visibility threshold. The active video plays automatically; all non-active videos pause.

Preload policy:

- Current video: `preload="auto"`.
- Previous and next video: `preload="metadata"` or eager source assignment.
- Videos farther away: no aggressive preload.

Playback policy:

- Muted by default for reliable autoplay.
- User can toggle mute.
- Tap video toggles play/pause.
- If autoplay is blocked, show a play affordance.

## Performance Notes

The current content set is about 67 MP4 files and roughly 607 MB. The MVP should avoid loading all full video data at once.

Performance priorities:

- Render only lightweight feed items.
- Keep playback active for only one video at a time.
- Avoid expensive per-frame JavaScript.
- Use native video playback and browser buffering.
- Keep controls CSS-driven and minimal.

If later performance is still weak, the next step is generating optimized mobile encodes and poster thumbnails. That is outside this MVP.

## Error Handling

- If no videos are found, show an empty state instead of a broken player.
- If one video fails to load, show a compact error state for that item and allow scrolling to the next item.
- If autoplay fails, keep the item visible and wait for user tap.

## Testing

Manual verification:

- Feed opens on mobile viewport.
- Swipe/scroll moves exactly one video at a time.
- Only the active video plays.
- Muting and play/pause work.
- Vertical, square, and wide videos keep an acceptable aspect ratio.
- Large content folder does not trigger initial full downloads.

Automated checks:

- `npm run lint`
- `npm run build`

Browser check:

- Run local dev server.
- Use mobile viewport to inspect the feed and confirm video elements render, play, pause, and snap correctly.

## Implementation Sequence

1. Make local videos addressable to the browser.
2. Replace scaffold landing page with the feed shell.
3. Add the client feed component with active-video control.
4. Add adaptive aspect-ratio presentation and minimal controls.
5. Validate lint, build, and browser behavior.
