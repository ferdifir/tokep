"use client";

import { useState } from "react";

export function AdminLogin() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function requestOtp() {
    setPending(true);
    setMessage("");

    const response = await fetch("/api/admin/auth/request-otp", {
      method: "POST",
    });
    const data = (await response.json()) as {
      debugCode?: string | null;
      error?: string;
      sent?: boolean;
    };

    if (!response.ok) {
      setMessage(data.error ?? "Gagal mengirim OTP");
    } else if (data.debugCode) {
      setMessage(`OTP dev: ${data.debugCode}`);
    } else {
      setMessage("OTP dikirim ke Telegram admin.");
    }

    setPending(false);
  }

  async function verifyOtp() {
    setPending(true);
    setMessage("");

    const response = await fetch("/api/admin/auth/verify", {
      body: JSON.stringify({ code }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Login gagal");
      setPending(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="grid h-dvh place-items-center overflow-y-auto bg-black px-5 py-5 text-white">
      <section className="w-full max-w-sm rounded-md border border-white/10 bg-zinc-950 p-5">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm leading-6 text-white/60">
          OTP hanya dikirim ke Telegram ID admin yang dikonfigurasi.
        </p>

        <button
          className="mt-5 h-11 w-full rounded-md bg-white text-sm font-semibold text-black disabled:opacity-50"
          disabled={pending}
          onClick={requestOtp}
          type="button"
        >
          Kirim OTP
        </button>

        <label className="mt-4 block text-sm font-medium text-white/70">
          Kode OTP
          <input
            className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black px-3 text-base text-white outline-none focus:border-white/40"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            value={code}
          />
        </label>

        <button
          className="mt-4 h-11 w-full rounded-md bg-white/10 text-sm font-semibold text-white disabled:opacity-50"
          disabled={pending || code.length !== 6}
          onClick={verifyOtp}
          type="button"
        >
          Masuk
        </button>

        {message ? (
          <p className="mt-4 rounded-md bg-white/5 p-3 text-sm leading-5 text-white/75">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
