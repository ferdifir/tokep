"use client";

import {
  BadgeCheck,
  Eye,
  EyeOff,
  Flag,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  Upload,
} from "lucide-react";
import { FormEvent, RefObject, useCallback, useEffect, useRef, useState } from "react";

type AdminMedia = {
  createdAt: string;
  filename: string;
  id: string;
  src: string;
  title: string;
  type: "PHOTO" | "VIDEO";
  visible: boolean;
};

type MediaPage = {
  items: AdminMedia[];
  nextCursor: string | null;
};

type AdminUser = {
  firstName: string | null;
  username: string | null;
};

type AdminListing = {
  category: string;
  contact: string | null;
  description: string;
  id: string;
  location: string;
  owner: AdminUser | null;
  providerName: string;
  reportCount: number;
  status: "ACTIVE" | "FLAGGED" | "RESTRICTED" | "HIDDEN";
  submittedBy: AdminUser | null;
  title: string;
  updatedAt: string;
  verified: boolean;
};

type AdminClaim = {
  adminNote: string | null;
  createdAt: string;
  evidence: string | null;
  id: string;
  listing: AdminListing;
  method: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISPUTED";
  updatedAt: string;
  user: AdminUser;
};

type AdminReport = {
  adminNote: string | null;
  createdAt: string;
  detail: string | null;
  id: string;
  listing: AdminListing;
  reason: string;
  reviewedAt: string | null;
  user: AdminUser;
};

type ServiceQueue = {
  claims: AdminClaim[];
  listings: AdminListing[];
  reports: AdminReport[];
};

function userLabel(user?: AdminUser | null) {
  if (!user) {
    return "Tidak diketahui";
  }

  return user.username ? `@${user.username}` : (user.firstName ?? "User Telegram");
}

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "services">("content");
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serviceQueue, setServiceQueue] = useState<ServiceQueue>({
    claims: [],
    listings: [],
    reports: [],
  });
  const [serviceLoading, setServiceLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadMedia = useCallback(
    async (cursor?: string | null, replace = false) => {
      setLoading(true);

      const params = new URLSearchParams({ limit: "20" });

      if (cursor) {
        params.set("cursor", cursor);
      }

      if (type !== "ALL") {
        params.set("type", type);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(`/api/admin/media?${params}`);

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const page = (await response.json()) as MediaPage;

      setItems((current) => (replace ? page.items : [...current, ...page.items]));
      setNextCursor(page.nextCursor);
      setLoading(false);
    },
    [search, type],
  );

  const loadServices = useCallback(async () => {
    setServiceLoading(true);

    const response = await fetch("/api/admin/services");

    if (response.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    const data = (await response.json()) as ServiceQueue;

    setServiceQueue(data);
    setServiceLoading(false);
  }, []);

  useEffect(() => {
    async function checkSession() {
      const response = await fetch("/api/admin/auth/session");
      const data = (await response.json()) as { authenticated: boolean };

      if (!data.authenticated) {
        window.location.href = "/admin/login";
        return;
      }

      setAuthenticated(true);
      await Promise.all([loadMedia(null, true), loadServices()]);
    }

    void checkSession();
  }, [loadMedia, loadServices]);

  async function refreshMedia() {
    await loadMedia(null, true);
  }

  async function syncMedia() {
    setMessage("Menyinkronkan media...");

    const response = await fetch("/api/admin/media/sync", { method: "POST" });
    const data = (await response.json()) as { synced?: number; error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Sync gagal");
      return;
    }

    setMessage(`Sync selesai: ${data.synced} item`);
    await refreshMedia();
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!(formData.get("file") instanceof File)) {
      return;
    }

    setUploading(true);
    setMessage("Mengupload media...");

    const response = await fetch("/api/admin/media", {
      body: formData,
      method: "POST",
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Upload gagal");
      setUploading(false);
      return;
    }

    form.reset();
    setMessage("Upload selesai");
    setUploading(false);
    await refreshMedia();
  }

  async function updateMedia(id: string, body: Partial<AdminMedia>) {
    const response = await fetch(`/api/admin/media/${id}`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    if (response.ok) {
      await refreshMedia();
    }
  }

  async function deleteMedia(item: AdminMedia) {
    const confirmed = window.confirm(
      `Hapus ${item.title}? File fisik juga akan dihapus.`,
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/media/${item.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { warning?: string };

    setMessage(data.warning ?? "Media dihapus");
    await refreshMedia();
  }

  async function updateListing(
    listingId: string,
    body: { status?: AdminListing["status"]; verified?: boolean },
  ) {
    const response = await fetch(`/api/admin/services/${listingId}`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    setMessage(response.ok ? "Listing servis diperbarui" : "Gagal update listing");
    await loadServices();
  }

  async function reviewClaim(
    claimId: string,
    status: "APPROVED" | "REJECTED" | "DISPUTED",
  ) {
    const response = await fetch(`/api/admin/services/claims/${claimId}`, {
      body: JSON.stringify({ status }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    setMessage(response.ok ? "Klaim diproses" : "Gagal memproses klaim");
    await loadServices();
  }

  async function reviewReport(
    reportId: string,
    listingStatus: AdminListing["status"],
  ) {
    const response = await fetch(`/api/admin/services/reports/${reportId}`, {
      body: JSON.stringify({ listingStatus }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });

    setMessage(response.ok ? "Laporan ditinjau" : "Gagal meninjau laporan");
    await loadServices();
  }

  if (authenticated === null) {
    return (
      <main className="grid h-dvh place-items-center overflow-y-auto bg-black text-white">
        Memuat admin...
      </main>
    );
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-none bg-black px-4 py-5 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Admin</h1>
            <p className="mt-1 text-sm text-white/55">
              Kelola konten dan moderation queue servis.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className={`h-10 rounded-md px-4 text-sm font-semibold ${
                activeTab === "content"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white"
              }`}
              onClick={() => setActiveTab("content")}
              type="button"
            >
              Konten
            </button>
            <button
              className={`h-10 rounded-md px-4 text-sm font-semibold ${
                activeTab === "services"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white"
              }`}
              onClick={() => setActiveTab("services")}
              type="button"
            >
              Servis
            </button>
          </div>
        </header>

        {message ? (
          <p className="mt-4 rounded-md bg-white/5 p-3 text-sm text-white/75">
            {message}
          </p>
        ) : null}

        {activeTab === "content" ? (
          <ContentAdmin
            deleteMedia={deleteMedia}
            fileRef={fileRef}
            items={items}
            loadMedia={loadMedia}
            loading={loading}
            nextCursor={nextCursor}
            refreshMedia={refreshMedia}
            search={search}
            setSearch={setSearch}
            setType={setType}
            syncMedia={syncMedia}
            type={type}
            updateMedia={updateMedia}
            uploadMedia={uploadMedia}
            uploading={uploading}
          />
        ) : (
          <ServiceAdmin
            loading={serviceLoading}
            queue={serviceQueue}
            refresh={loadServices}
            reviewClaim={reviewClaim}
            reviewReport={reviewReport}
            updateListing={updateListing}
          />
        )}
      </div>
    </main>
  );
}

function ContentAdmin({
  deleteMedia,
  fileRef,
  items,
  loadMedia,
  loading,
  nextCursor,
  refreshMedia,
  search,
  setSearch,
  setType,
  syncMedia,
  type,
  updateMedia,
  uploadMedia,
  uploading,
}: {
  deleteMedia: (item: AdminMedia) => Promise<void>;
  fileRef: RefObject<HTMLInputElement | null>;
  items: AdminMedia[];
  loadMedia: (cursor?: string | null, replace?: boolean) => Promise<void>;
  loading: boolean;
  nextCursor: string | null;
  refreshMedia: () => Promise<void>;
  search: string;
  setSearch: (value: string) => void;
  setType: (value: string) => void;
  syncMedia: () => Promise<void>;
  type: string;
  updateMedia: (id: string, body: Partial<AdminMedia>) => Promise<void>;
  uploadMedia: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  uploading: boolean;
}) {
  return (
    <>
      <div className="mt-5 flex justify-end">
        <button
          className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-black"
          onClick={syncMedia}
          type="button"
        >
          <RefreshCw className="mr-2 inline" size={16} />
          Sync
        </button>
      </div>

      <form
        className="mt-4 grid gap-3 rounded-md border border-white/10 bg-zinc-950 p-4 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={uploadMedia}
      >
        <input
          className="rounded-md border border-white/10 bg-black px-3 py-2 text-sm"
          name="title"
          placeholder="Judul opsional"
        />
        <input
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4"
          className="rounded-md border border-white/10 bg-black px-3 py-2 text-sm"
          name="file"
          ref={fileRef}
          required
          type="file"
        />
        <button
          className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-black disabled:opacity-50"
          disabled={uploading}
          type="submit"
        >
          <Upload className="mr-2 inline" size={16} />
          Upload
        </button>
      </form>

      <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <select
          className="h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm"
          onChange={(event) => setType(event.target.value)}
          value={type}
        >
          <option value="ALL">Semua</option>
          <option value="PHOTO">Foto</option>
          <option value="VIDEO">Video</option>
        </select>
        <label className="relative block">
          <Search className="absolute left-3 top-2.5 text-white/45" size={18} />
          <input
            className="h-10 w-full rounded-md border border-white/10 bg-zinc-950 pl-10 pr-3 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul atau filename"
            value={search}
          />
        </label>
        <button
          className="h-10 rounded-md bg-white/10 px-4 text-sm font-semibold"
          onClick={refreshMedia}
          type="button"
        >
          Terapkan
        </button>
      </div>

      <section className="mt-5 grid gap-3">
        {items.map((item) => (
          <article
            className="grid gap-3 rounded-md border border-white/10 bg-zinc-950 p-3 md:grid-cols-[96px_1fr_auto]"
            key={item.id}
          >
            <div className="aspect-square overflow-hidden rounded-md bg-black">
              {item.type === "PHOTO" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={item.title}
                  className="h-full w-full object-cover"
                  src={item.src}
                />
              ) : (
                <video
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                  src={item.src}
                />
              )}
            </div>
            <div className="min-w-0">
              <input
                className="h-10 w-full rounded-md border border-white/10 bg-black px-3 text-sm font-semibold"
                defaultValue={item.title}
                onBlur={(event) => {
                  if (event.target.value !== item.title) {
                    void updateMedia(item.id, { title: event.target.value });
                  }
                }}
              />
              <p className="mt-2 break-all text-xs leading-5 text-white/45">
                {item.type} - {item.filename}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {item.visible ? "Visible" : "Hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2 md:flex-col">
              <button
                className="grid h-10 w-10 place-items-center rounded-md bg-white/10"
                onClick={() => updateMedia(item.id, { visible: !item.visible })}
                title={item.visible ? "Hide" : "Show"}
                type="button"
              >
                {item.visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                className="grid h-10 w-10 place-items-center rounded-md bg-red-500/20 text-red-200"
                onClick={() => deleteMedia(item)}
                title="Delete file"
                type="button"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </section>

      {nextCursor ? (
        <button
          className="mt-5 h-11 w-full rounded-md bg-white/10 text-sm font-semibold disabled:opacity-50"
          disabled={loading}
          onClick={() => loadMedia(nextCursor)}
          type="button"
        >
          {loading ? "Memuat..." : "Muat lagi"}
        </button>
      ) : null}
    </>
  );
}

function ServiceAdmin({
  loading,
  queue,
  refresh,
  reviewClaim,
  reviewReport,
  updateListing,
}: {
  loading: boolean;
  queue: ServiceQueue;
  refresh: () => Promise<void>;
  reviewClaim: (
    claimId: string,
    status: "APPROVED" | "REJECTED" | "DISPUTED",
  ) => Promise<void>;
  reviewReport: (
    reportId: string,
    listingStatus: AdminListing["status"],
  ) => Promise<void>;
  updateListing: (
    listingId: string,
    body: { status?: AdminListing["status"]; verified?: boolean },
  ) => Promise<void>;
}) {
  return (
    <div className="mt-5 grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-white/55">
          {queue.claims.length} klaim, {queue.reports.length} laporan,{" "}
          {queue.listings.length} listing perlu review
        </div>
        <button
          className="h-10 rounded-md bg-white/10 px-4 text-sm font-semibold disabled:opacity-50"
          disabled={loading}
          onClick={refresh}
          type="button"
        >
          <RefreshCw className="mr-2 inline" size={16} />
          Refresh
        </button>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Klaim</h2>
        <div className="mt-3 grid gap-3">
          {queue.claims.length ? (
            queue.claims.map((claim) => (
              <article
                className="rounded-md border border-white/10 bg-zinc-950 p-3"
                key={claim.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">
                      {claim.listing.title}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      {claim.listing.providerName} - diajukan {userLabel(claim.user)}
                    </p>
                  </div>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/70">
                    {claim.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Metode: {claim.method}
                  {claim.evidence ? ` - Bukti: ${claim.evidence}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="h-10 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-black"
                    onClick={() => reviewClaim(claim.id, "APPROVED")}
                    type="button"
                  >
                    <ShieldCheck className="mr-2 inline" size={16} />
                    Approve
                  </button>
                  <button
                    className="h-10 rounded-md bg-white/10 px-3 text-sm font-semibold"
                    onClick={() => reviewClaim(claim.id, "DISPUTED")}
                    type="button"
                  >
                    Sengketa
                  </button>
                  <button
                    className="h-10 rounded-md bg-red-500/20 px-3 text-sm font-semibold text-red-100"
                    onClick={() => reviewClaim(claim.id, "REJECTED")}
                    type="button"
                  >
                    <ShieldX className="mr-2 inline" size={16} />
                    Reject
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState text="Tidak ada klaim terbuka." />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Laporan</h2>
        <div className="mt-3 grid gap-3">
          {queue.reports.length ? (
            queue.reports.map((report) => (
              <article
                className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3"
                key={report.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">
                      {report.listing.title}
                    </p>
                    <p className="mt-1 text-sm text-amber-100/70">
                      {report.listing.providerName} - dilaporkan{" "}
                      {userLabel(report.user)}
                    </p>
                  </div>
                  <span className="rounded-md bg-black/35 px-2 py-1 text-xs font-semibold text-amber-100">
                    {report.reason}
                  </span>
                </div>
                {report.detail ? (
                  <p className="mt-3 text-sm leading-6 text-amber-50/80">
                    {report.detail}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="h-10 rounded-md bg-white px-3 text-sm font-semibold text-black"
                    onClick={() => reviewReport(report.id, "ACTIVE")}
                    type="button"
                  >
                    Aman
                  </button>
                  <button
                    className="h-10 rounded-md bg-amber-300 px-3 text-sm font-semibold text-black"
                    onClick={() => reviewReport(report.id, "FLAGGED")}
                    type="button"
                  >
                    <Flag className="mr-2 inline" size={16} />
                    Warning
                  </button>
                  <button
                    className="h-10 rounded-md bg-red-500/20 px-3 text-sm font-semibold text-red-100"
                    onClick={() => reviewReport(report.id, "RESTRICTED")}
                    type="button"
                  >
                    Restrict
                  </button>
                  <button
                    className="h-10 rounded-md bg-red-500 px-3 text-sm font-semibold text-white"
                    onClick={() => reviewReport(report.id, "HIDDEN")}
                    type="button"
                  >
                    Hide
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState text="Tidak ada laporan terbuka." />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Listing Perlu Review</h2>
        <div className="mt-3 grid gap-3">
          {queue.listings.length ? (
            queue.listings.map((listing) => (
              <article
                className="rounded-md border border-white/10 bg-zinc-950 p-3"
                key={listing.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{listing.title}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {listing.providerName} - {listing.location} -{" "}
                      {listing.category}
                    </p>
                  </div>
                  <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/70">
                    {listing.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  {listing.description}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  Submitter: {userLabel(listing.submittedBy)} - Owner:{" "}
                  {userLabel(listing.owner)} - Laporan: {listing.reportCount}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="h-10 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-black"
                    onClick={() =>
                      updateListing(listing.id, {
                        status: "ACTIVE",
                        verified: true,
                      })
                    }
                    type="button"
                  >
                    <BadgeCheck className="mr-2 inline" size={16} />
                    Verify
                  </button>
                  <button
                    className="h-10 rounded-md bg-amber-300 px-3 text-sm font-semibold text-black"
                    onClick={() =>
                      updateListing(listing.id, {
                        status: "FLAGGED",
                      })
                    }
                    type="button"
                  >
                    Warning
                  </button>
                  <button
                    className="h-10 rounded-md bg-red-500/20 px-3 text-sm font-semibold text-red-100"
                    onClick={() =>
                      updateListing(listing.id, {
                        status: "RESTRICTED",
                      })
                    }
                    type="button"
                  >
                    Restrict
                  </button>
                  <button
                    className="h-10 rounded-md bg-red-500 px-3 text-sm font-semibold text-white"
                    onClick={() =>
                      updateListing(listing.id, {
                        status: "HIDDEN",
                      })
                    }
                    type="button"
                  >
                    Hide
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyState text="Tidak ada listing yang perlu review." />
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-zinc-950 p-5 text-center text-sm text-white/50">
      {text}
    </div>
  );
}
