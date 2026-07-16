import "dotenv/config";
import { prisma } from "@/lib/db";
import { syncMediaDirectory } from "@/lib/server-media";

async function main() {
  const result = await syncMediaDirectory();

  console.log(`Synced ${result.synced} media items`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
