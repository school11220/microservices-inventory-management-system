import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  await prisma.order.count();
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
