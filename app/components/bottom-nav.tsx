"use client";

import { BriefcaseBusiness, Clapperboard, Grid3X3, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Feed",
    icon: Clapperboard,
  },
  {
    href: "/foto",
    label: "Foto",
    icon: Grid3X3,
  },
  {
    href: "/servis",
    label: "Servis",
    icon: BriefcaseBusiness,
  },
  {
    href: "/profil",
    label: "Profil",
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-white/10 bg-black px-5 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 text-white">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`grid h-12 place-items-center rounded-md transition ${
                active
                  ? "bg-white text-black"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" size={21} strokeWidth={2.35} />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
