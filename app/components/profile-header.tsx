"use client";

import { useEffect, useState } from "react";

type TelegramUnsafeUser = {
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  username?: string;
};

type TelegramInitDataUnsafe = {
  user?: TelegramUnsafeUser;
};

const fallbackProfile = {
  bio: "Belum ada bio.",
  name: "Pengguna Telegram",
  photoUrl: null as string | null,
  username: "Username belum tersedia",
};

type SessionUser = {
  bio: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  username: string | null;
};

export function ProfileHeader() {
  const [profile, setProfile] = useState(fallbackProfile);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const initDataUnsafe = webApp?.initDataUnsafe as
      | TelegramInitDataUnsafe
      | undefined;
    const user = initDataUnsafe?.user;

    if (!user) {
      return;
    }

    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    const telegramPhotoUrl = user.photo_url ?? null;
    const telegramUsername = user.username ?? null;

    queueMicrotask(() => {
      setProfile({
        bio: fallbackProfile.bio,
        name: name || fallbackProfile.name,
        photoUrl: telegramPhotoUrl,
        username: telegramUsername
          ? `@${telegramUsername}`
          : fallbackProfile.username,
      });
    });

    if (!webApp?.initData) {
      return;
    }

    async function loadStoredProfile() {
      const response = await fetch("/api/telegram/session", {
        headers: {
          "x-telegram-init-data": webApp?.initData ?? "",
        },
        method: "POST",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user?: SessionUser };
      const storedUser = data.user;

      if (!storedUser) {
        return;
      }

      const storedName = [storedUser.firstName, storedUser.lastName]
        .filter(Boolean)
        .join(" ");

      setProfile({
        bio: storedUser.bio?.trim() || fallbackProfile.bio,
        name: storedName || name || fallbackProfile.name,
        photoUrl: storedUser.photoUrl ?? telegramPhotoUrl,
        username: storedUser.username
          ? `@${storedUser.username}`
          : telegramUsername
            ? `@${telegramUsername}`
            : fallbackProfile.username,
      });
    }

    void loadStoredProfile();
  }, []);

  return (
    <header className="mb-5 flex items-center gap-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-2xl font-bold text-black">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={profile.name}
            className="h-full w-full object-cover"
            src={profile.photoUrl}
          />
        ) : (
          profile.name.slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold leading-7">
          {profile.name}
        </h1>
        <p className="text-sm font-medium leading-5 text-white/60">
          {profile.username}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/75">
          {profile.bio}
        </p>
      </div>
    </header>
  );
}
