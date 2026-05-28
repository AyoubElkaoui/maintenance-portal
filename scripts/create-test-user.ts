import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Elmar@2025', 10);

  await prisma.user.upsert({
    where: { email: 'lilly@elmarmaintenance.com' },
    update: { password: hashedPassword },
    create: {
      id: 'lilly',
      email: 'lilly@elmarmaintenance.com',
      name: 'Lilly',
      password: hashedPassword,
      role: 'uploader',
    },
  });

  await prisma.user.upsert({
    where: { email: 'pamela@elmarmaintenance.com' },
    update: { password: hashedPassword },
    create: {
      id: 'pamela',
      email: 'pamela@elmarmaintenance.com',
      name: 'Pamela',
      password: hashedPassword,
      role: 'reviewer',
    },
  });

  console.log('✅ Users aangemaakt:');
  console.log('   Lilly: lilly@elmarmaintenance.com / Elmar@2025');
  console.log('   Pamela: pamela@elmarmaintenance.com / Elmar@2025');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
