import "dotenv/config";
import { prisma } from "@/lib/db";
import { indexMediaDirectory } from "@/lib/server-media";

async function main() {
  const result = await indexMediaDirectory();

  console.log(`Indexed ${result.synced} media items`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
