import { BottomNav } from "@/app/components/bottom-nav";
import { getServiceDetail } from "@/lib/service-store";
import { ChevronLeft, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getServiceDetail({ id });

  if (!detail) {
    notFound();
  }

  const { item, reviews } = detail;
  const flagged = item.status === "flagged" || item.status === "restricted";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black text-white">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4 py-4">
        <div className="mx-auto max-w-xl">
          <div className="mb-4 flex items-center gap-3">
            <Link
              aria-label="Kembali ke servis"
              className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-zinc-950"
              href="/servis"
            >
              <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.5} />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold leading-7">
                {item.title}
              </h1>
              <p className="truncate text-sm text-white/55">{item.name}</p>
            </div>
          </div>

          {flagged ? (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-5 text-amber-100">
              <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              <p>
                Ada {item.reportCount} laporan aktif. Periksa review dan
                gunakan jasa ini dengan hati-hati.
              </p>
            </div>
          ) : null}

          <section className="rounded-md border border-white/10 bg-zinc-950 p-3">
            <div className="flex items-start gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-white text-base font-bold text-black">
                {item.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/70">
                    {item.category}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/70">
                    <Sparkles
                      aria-hidden="true"
                      className="text-emerald-300"
                      size={13}
                    />
                    {item.qualityLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {item.description}
                </p>
              </div>
            </div>

            {item.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white/60"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold">Review pengguna</h2>
              <span className="text-sm text-white/45">{reviews.length}</span>
            </div>

            {reviews.length ? (
              <div className="grid gap-2">
                {reviews.map((review) => (
                  <article
                    className="rounded-md border border-white/10 bg-zinc-950 p-3"
                    key={review.id}
                  >
                    <p className="text-sm font-semibold text-white/80">
                      @{review.username}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                      {review.review}
                    </p>
                    {review.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {review.tags.map((tag) => (
                          <span
                            className="rounded-md bg-black px-2 py-1 text-xs font-medium text-white/55"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-white/10 bg-zinc-950 p-5 text-center text-sm text-white/55">
                Belum ada review tertulis.
              </div>
            )}
          </section>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
