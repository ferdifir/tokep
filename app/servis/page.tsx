import { BottomNav } from "@/app/components/bottom-nav";
import { ServiceCatalog } from "@/app/components/service-catalog";
import {
  getServicePage,
  serviceCategories,
} from "@/lib/service-store";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const services = await getServicePage({});

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-black text-white">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4">
        <ServiceCatalog
          categories={serviceCategories}
          initialNextCursor={services.nextCursor}
          initialServices={services.items}
        />
      </main>
      <BottomNav />
    </div>
  );
}
