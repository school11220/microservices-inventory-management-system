import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function upsertUser(username: string, password: string, role: Role) {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role },
    create: { username, passwordHash, role },
  });
}

async function main() {
  await upsertUser('admin', 'ChangeMe123!', Role.ADMIN);
  await upsertUser('staff', 'ChangeMe123!', Role.STAFF);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
