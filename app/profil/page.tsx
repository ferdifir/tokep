import { BottomNav } from "@/app/components/bottom-nav";
import { ProfileHeader } from "@/app/components/profile-header";
import { ProfileSavedGrid } from "@/app/components/profile-saved-grid";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black text-white">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4 py-5">
        <ProfileHeader />
        <ProfileSavedGrid />
      </main>
      <BottomNav />
    </div>
  );
}
