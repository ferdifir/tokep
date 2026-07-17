"use client";

import type { ServiceCatalogItem } from "@/lib/service-store";
import {
  BadgeCheck,
  CircleAlert,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type PanelState =
  | { mode: "add" }
  | { mode: "claim"; serviceId: string }
  | { mode: "recommend"; serviceId: string }
  | { mode: "report"; serviceId: string }
  | null;

type ServicePage = {
  items: ServiceCatalogItem[];
  nextCursor: string | null;
};

type ApiItemResponse = {
  item?: ServiceCatalogItem;
  error?: string;
};

const reportReasons = [
  { label: "Tidak datang", value: "NO_SHOW" },
  { label: "Harga tidak sesuai", value: "PRICE_MISMATCH" },
  { label: "Hasil tidak sesuai", value: "POOR_RESULT" },
  { label: "Komunikasi buruk", value: "POOR_COMMUNICATION" },
  { label: "Dugaan penipuan", value: "SUSPECTED_FRAUD" },
];

const recommendationTags = [
  "Tepat waktu",
  "Harga jelas",
  "Hasil rapi",
  "Komunikasi baik",
];

function telegramHeaders() {
  const initData = window.Telegram?.WebApp?.initData ?? "";

  return initData
    ? { "x-telegram-init-data": initData }
    : ({} as Record<string, string>);
}

function upsertService(
  services: ServiceCatalogItem[],
  item: ServiceCatalogItem,
) {
  const exists = services.some((service) => service.id === item.id);

  if (!exists) {
    return [item, ...services];
  }

  return services.map((service) => (service.id === item.id ? item : service));
}

export function ServiceCatalog({
  categories,
  initialNextCursor,
  initialServices,
}: {
  categories: string[];
  initialNextCursor: string | null;
  initialServices: ServiceCatalogItem[];
}) {
  const [services, setServices] = useState(initialServices);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [panel, setPanel] = useState<PanelState>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);

  const panelService =
    panel && "serviceId" in panel
      ? services.find((service) => service.id === panel.serviceId)
      : null;

  useEffect(() => {
    if (!panel) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      const focusTarget =
        panelRef.current?.querySelector<HTMLElement>("[data-autofocus]");

      focusTarget?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [panel]);

  async function loadServices(category: string, cursor?: string | null) {
    setLoading(true);

    const params = new URLSearchParams({ limit: "12" });

    if (category !== "Semua") {
      params.set("category", category);
    }

    if (cursor) {
      params.set("cursor", cursor);
    }

    const response = await fetch(`/api/services?${params}`, {
      headers: telegramHeaders(),
    });

    if (response.ok) {
      const page = (await response.json()) as ServicePage;

      setServices((current) =>
        cursor ? [...current, ...page.items] : page.items,
      );
      setNextCursor(page.nextCursor);
    }

    setLoading(false);
  }

  async function selectCategory(category: string) {
    setActiveCategory(category);
    await loadServices(category);
  }

  async function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/services", {
      body: JSON.stringify({
        contact: String(formData.get("contact") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        isOwner: formData.get("isOwner") === "on",
        location: String(formData.get("location") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        title: String(formData.get("title") ?? "").trim(),
      }),
      headers: {
        "Content-Type": "application/json",
        ...telegramHeaders(),
      },
      method: "POST",
    });
    const data = (await response.json()) as ApiItemResponse;

    if (!response.ok || !data.item) {
      setNotice(data.error ?? "Gagal menambahkan jasa.");
      return;
    }

    setServices((current) => upsertService(current, data.item!));
    setNotice("Jasa/rekomendasi tersimpan ke database.");
    setPanel(null);
    form.reset();
  }

  async function recommendService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!panelService) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch(
      `/api/services/${panelService.id}/recommendations`,
      {
        body: JSON.stringify({
          review: String(formData.get("review") ?? "").trim(),
          tags: formData.getAll("tags").map(String),
        }),
        headers: {
          "Content-Type": "application/json",
          ...telegramHeaders(),
        },
        method: "POST",
      },
    );
    const data = (await response.json()) as ApiItemResponse;

    if (!response.ok || !data.item) {
      setNotice(data.error ?? "Gagal mengirim rekomendasi.");
      return;
    }

    setServices((current) => upsertService(current, data.item!));
    setNotice(`Rekomendasi untuk ${panelService.name} tersimpan.`);
    setPanel(null);
    form.reset();
  }

  async function reportService(reason: string) {
    if (!panelService) {
      return;
    }

    const response = await fetch(`/api/services/${panelService.id}/reports`, {
      body: JSON.stringify({ reason }),
      headers: {
        "Content-Type": "application/json",
        ...telegramHeaders(),
      },
      method: "POST",
    });
    const data = (await response.json()) as ApiItemResponse;

    if (!response.ok || !data.item) {
      setNotice(data.error ?? "Gagal mengirim laporan.");
      return;
    }

    setServices((current) => upsertService(current, data.item!));
    setNotice(`${panelService.name} diberi peringatan untuk pengguna lain.`);
    setPanel(null);
  }

  async function claimService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!panelService) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch(`/api/services/${panelService.id}/claims`, {
      body: JSON.stringify({
        evidence: String(formData.get("evidence") ?? "").trim(),
        method: String(formData.get("method") ?? ""),
      }),
      headers: {
        "Content-Type": "application/json",
        ...telegramHeaders(),
      },
      method: "POST",
    });
    const data = (await response.json()) as ApiItemResponse;

    if (!response.ok || !data.item) {
      setNotice(data.error ?? "Gagal mengirim klaim.");
      return;
    }

    setServices((current) => upsertService(current, data.item!));
    setNotice("Klaim dikirim. Admin hanya perlu masuk jika ada sengketa.");
    setPanel(null);
    form.reset();
  }

  function openPanel(nextPanel: PanelState) {
    setNotice("");
    setPanel(nextPanel);
  }

  function renderPanel() {
    if (!panel) {
      return null;
    }

    return (
      <section
        className="mb-3 scroll-mt-36 rounded-md border border-white/20 bg-zinc-950 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
        ref={panelRef}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {panel.mode === "add"
              ? "Tambah jasa"
              : panel.mode === "recommend"
                ? `Rekomendasikan ${panelService?.name ?? "jasa"}`
                : panel.mode === "claim"
                  ? `Klaim ${panelService?.name ?? "listing"}`
                  : `Laporkan ${panelService?.name ?? "jasa"}`}
          </h2>
          <button
            aria-label="Tutup panel"
            className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-white"
            onClick={() => setPanel(null)}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.4} />
          </button>
        </div>

        {panel.mode === "add" ? (
          <form className="grid gap-2" onSubmit={addService}>
            <input
              className="h-11 rounded-md border border-white/10 bg-black px-3 text-sm outline-none focus:border-white/35"
              data-autofocus
              name="name"
              placeholder="Nama orang/usaha"
            />
            <input
              className="h-11 rounded-md border border-white/10 bg-black px-3 text-sm outline-none focus:border-white/35"
              name="title"
              placeholder="Jenis jasa"
            />
            <input
              className="h-11 rounded-md border border-white/10 bg-black px-3 text-sm outline-none focus:border-white/35"
              name="location"
              placeholder="Lokasi"
            />
            <input
              className="h-11 rounded-md border border-white/10 bg-black px-3 text-sm outline-none focus:border-white/35"
              name="contact"
              placeholder="Kontak publik opsional"
            />
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-black px-3 text-sm text-white/75">
              <input name="isOwner" type="checkbox" />
              Saya pemilik jasa ini
            </label>
            <textarea
              className="min-h-20 rounded-md border border-white/10 bg-black px-3 py-2 text-sm leading-6 outline-none focus:border-white/35"
              name="description"
              placeholder="Ceritakan jasa ini singkat saja"
            />
            <button
              className="h-11 rounded-md bg-white text-sm font-semibold text-black"
              type="submit"
            >
              Tambahkan ke katalog
            </button>
          </form>
        ) : null}

        {panel.mode === "recommend" ? (
          <form className="grid gap-2" onSubmit={recommendService}>
            <textarea
              className="min-h-24 rounded-md border border-white/10 bg-black px-3 py-2 text-sm leading-6 outline-none focus:border-white/35"
              data-autofocus
              name="review"
              placeholder="Apa yang membuat jasa ini layak direkomendasikan?"
            />
            <div className="grid grid-cols-2 gap-2">
              {recommendationTags.map((tag) => (
                <label
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-black px-3 py-2 text-xs font-semibold text-white/70"
                  key={tag}
                >
                  <input name="tags" type="checkbox" value={tag} />
                  {tag}
                </label>
              ))}
            </div>
            <button
              className="h-11 rounded-md bg-white text-sm font-semibold text-black"
              type="submit"
            >
              Kirim rekomendasi
            </button>
          </form>
        ) : null}

        {panel.mode === "claim" ? (
          <form className="grid gap-2" onSubmit={claimService}>
            <p className="text-sm leading-6 text-white/65">
              Klaim diproses dari bukti. Jika ada klaim ganda, statusnya
              menjadi sengketa dan admin menilai bukti.
            </p>
            <select
              className="h-11 rounded-md border border-white/10 bg-black px-3 text-sm outline-none focus:border-white/35"
              data-autofocus
              name="method"
            >
              <option value="contact_otp">OTP ke kontak listing</option>
              <option value="public_profile">Bukti profil publik</option>
              <option value="recommender_approval">
                Persetujuan rekomendator
              </option>
            </select>
            <textarea
              className="min-h-24 rounded-md border border-white/10 bg-black px-3 py-2 text-sm leading-6 outline-none focus:border-white/35"
              name="evidence"
              placeholder="Link/bukti pendukung"
            />
            <button
              className="h-11 rounded-md bg-white text-sm font-semibold text-black"
              type="submit"
            >
              Kirim klaim
            </button>
          </form>
        ) : null}

        {panel.mode === "report" ? (
          <div className="grid gap-2">
            <p className="text-sm leading-6 text-white/65">
              Laporan tidak menghapus jasa. Jika valid atau berulang, kartu
              diberi peringatan agar pengguna lain lebih berhati-hati.
            </p>
            {reportReasons.map((reason) => (
              <button
                className="flex h-11 items-center justify-between rounded-md border border-white/10 bg-black px-3 text-left text-sm font-semibold text-white"
                data-autofocus={reason.value === reportReasons[0].value}
                key={reason.value}
                onClick={() => void reportService(reason.value)}
                type="button"
              >
                {reason.label}
                <Flag aria-hidden="true" size={16} strokeWidth={2.3} />
              </button>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-4">
      <header className="sticky top-0 z-20 bg-black pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold leading-7">Servis</h1>
            <p className="mt-0.5 text-sm leading-5 text-white/55">
              Katalog jasa dan rekomendasi dari pengguna.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              aria-label="Cari servis"
              className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-zinc-950 text-white"
              type="button"
            >
              <Search aria-hidden="true" size={20} strokeWidth={2.4} />
            </button>
            <button
              aria-label="Tambah rekomendasi jasa"
              className="grid h-11 w-11 place-items-center rounded-md bg-white text-black"
              onClick={() => openPanel({ mode: "add" })}
              type="button"
            >
              <Plus aria-hidden="true" size={21} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {categories.length > 1 ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {categories.map((category) => (
              <button
                className={`h-9 shrink-0 rounded-md px-3 text-sm font-semibold ${
                  activeCategory === category
                    ? "bg-white text-black"
                    : "border border-white/10 bg-zinc-950 text-white/70"
                }`}
                key={category}
                onClick={() => void selectCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {notice ? (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-5 text-emerald-100">
          <Send aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          <p>{notice}</p>
        </div>
      ) : null}

      {panel?.mode === "add" ? renderPanel() : null}

      <section className="grid gap-3">
        {services.map((service) => {
          const isPanelTarget =
            panel && "serviceId" in panel && panel.serviceId === service.id;

          return (
            <div className="grid gap-3" key={service.id}>
              {isPanelTarget ? renderPanel() : null}
              <ServiceCard
                active={Boolean(isPanelTarget)}
                onClaim={() =>
                  openPanel({ mode: "claim", serviceId: service.id })
                }
                onRecommend={() =>
                  openPanel({ mode: "recommend", serviceId: service.id })
                }
                onReport={() =>
                  openPanel({ mode: "report", serviceId: service.id })
                }
                service={service}
              />
            </div>
          );
        })}
      </section>

      {nextCursor ? (
        <button
          className="mt-3 h-11 w-full rounded-md border border-white/10 bg-zinc-950 text-sm font-semibold text-white disabled:opacity-50"
          disabled={loading}
          onClick={() => void loadServices(activeCategory, nextCursor)}
          type="button"
        >
          {loading ? "Memuat..." : "Muat lagi"}
        </button>
      ) : null}
    </div>
  );
}

function ServiceCard({
  active,
  onClaim,
  onRecommend,
  onReport,
  service,
}: {
  active: boolean;
  onClaim: () => void;
  onRecommend: () => void;
  onReport: () => void;
  service: ServiceCatalogItem;
}) {
  const flagged = service.status === "flagged" || service.status === "restricted";

  return (
    <article
      className={`rounded-md border p-3 ${
        flagged
          ? "border-amber-300/30 bg-amber-300/10"
          : active
            ? "border-white/30 bg-zinc-950"
            : "border-white/10 bg-zinc-950"
      }`}
    >
      {flagged ? (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-black/45 p-3 text-sm leading-5 text-amber-100">
          <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <p>
            Ada {service.reportCount} laporan aktif. Gunakan jasa ini dengan
            lebih hati-hati.
          </p>
        </div>
      ) : null}

      {service.claimStatus !== "none" ? (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-white/5 p-3 text-sm leading-5 text-white/65">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <p>
            Status klaim:{" "}
            {service.claimStatus === "pending"
              ? "menunggu verifikasi"
              : service.claimStatus === "disputed"
                ? "sengketa"
                : "disetujui"}
          </p>
        </div>
      ) : null}

      <div className="flex gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-white text-base font-bold text-black">
          {service.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base font-semibold leading-6">
                  {service.title}
                </h2>
                {service.verified ? (
                  <BadgeCheck
                    aria-label="Terverifikasi"
                    className="shrink-0 text-sky-300"
                    size={17}
                    strokeWidth={2.4}
                  />
                ) : null}
              </div>
              <p className="truncate text-sm leading-5 text-white/60">
                {service.name}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold">
              <Sparkles
                aria-hidden="true"
                className="text-emerald-300"
                size={14}
                strokeWidth={2.4}
              />
              {service.qualityLabel}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" size={13} />
              {service.location}
            </span>
            <span>{service.category}</span>
            <span>{service.reviews} review</span>
          </div>
          {service.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {service.tags.slice(0, 4).map((tag) => (
                <span
                  className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white/60"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/75">
        {service.description}
      </p>

      <div className="mt-3 rounded-md bg-black p-3">
        <p className="line-clamp-2 text-sm leading-6 text-white/75">
          {service.review}
        </p>
        <p className="mt-2 text-xs font-medium text-white/45">
          Direkomendasikan oleh {service.recommendations} pengguna
        </p>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_1fr_44px] gap-2">
        {service.isOwner ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-black"
            type="button"
          >
            <ShieldCheck aria-hidden="true" size={17} strokeWidth={2.4} />
            Kelola
          </button>
        ) : service.contactAvailable ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-black"
            type="button"
          >
            <MessageCircle aria-hidden="true" size={17} strokeWidth={2.4} />
            Kontak
          </button>
        ) : (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-black"
            onClick={onClaim}
            type="button"
          >
            <ShieldCheck aria-hidden="true" size={17} strokeWidth={2.4} />
            Klaim
          </button>
        )}
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-black text-sm font-semibold text-white"
          onClick={onRecommend}
          type="button"
        >
          <Heart aria-hidden="true" size={17} strokeWidth={2.4} />
          Rekomendasi
        </button>
        {!service.isOwner ? (
          <button
            aria-label="Laporkan jasa"
            className="grid h-10 place-items-center rounded-md border border-white/10 bg-black text-white/70"
            onClick={onReport}
            type="button"
          >
            <CircleAlert aria-hidden="true" size={18} strokeWidth={2.4} />
          </button>
        ) : (
          <span className="h-10" />
        )}
      </div>
      <Link
        className="mt-2 flex h-10 items-center justify-center rounded-md border border-white/10 bg-black text-sm font-semibold text-white/75"
        href={`/servis/${service.id}`}
      >
        Lihat review pengguna
      </Link>
    </article>
  );
}
