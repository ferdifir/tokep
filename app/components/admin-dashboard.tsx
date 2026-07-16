"use client";

import { Eye, EyeOff, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

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

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    async function checkSession() {
      const response = await fetch("/api/admin/auth/session");
      const data = (await response.json()) as { authenticated: boolean };

      if (!data.authenticated) {
        window.location.href = "/admin/login";
        return;
      }

      setAuthenticated(true);
      await loadMedia(null, true);
    }

    void checkSession();
  }, [loadMedia]);

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

  if (authenticated === null) {
    return (
      <main className="grid h-dvh place-items-center overflow-y-auto bg-black text-white">
        Memuat admin...
      </main>
    );
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-none bg-black px-4 py-5 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Admin Konten</h1>
            <p className="mt-1 text-sm text-white/55">
              Upload, edit, hide/show, delete file, dan sync media.
            </p>
          </div>
          <button
            className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-black"
            onClick={syncMedia}
            type="button"
          >
            <RefreshCw className="mr-2 inline" size={16} />
            Sync
          </button>
        </header>

        <form
          className="mt-5 grid gap-3 rounded-md border border-white/10 bg-zinc-950 p-4 md:grid-cols-[1fr_1fr_auto]"
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

        {message ? (
          <p className="mt-4 rounded-md bg-white/5 p-3 text-sm text-white/75">
            {message}
          </p>
        ) : null}

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
                  {item.type} · {item.filename}
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
      </div>
    </main>
  );
}
