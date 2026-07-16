"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        backgroundColor?: string;
        bottomBarColor?: string;
        colorScheme?: string;
        expand?: () => void;
        initData?: string;
        initDataUnsafe?: unknown;
        ready?: () => void;
        setBackgroundColor?: (color: string) => void;
        setBottomBarColor?: (color: string) => void;
      };
    };
  }
}

function syncTelegramSession() {
  const webApp = window.Telegram?.WebApp;

  if (!webApp) {
    return;
  }

  webApp.ready?.();
  webApp.expand?.();
  webApp.setBackgroundColor?.("#000000");
  webApp.setBottomBarColor?.("#000000");

  void fetch("/api/telegram/session", {
    headers: {
      "x-telegram-init-data": webApp.initData ?? "",
    },
    method: "POST",
  });
}

export function TelegramBridge() {
  useEffect(() => {
    syncTelegramSession();
  }, []);

  return (
    <Script
      onLoad={syncTelegramSession}
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
    />
  );
}
