import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default users - wachtwoord: Elmar@2025
  const hashedPassword = await bcrypt.hash('Elmar@2025', 10);

  // Update or create users
  await prisma.user.upsert({
    where: { email: 'lilly@elmarmaintenance.com' },
    update: {
      password: hashedPassword,
      name: 'Lilly',
      role: 'uploader',
    },
    create: {
      email: 'lilly@elmarmaintenance.com',
      name: 'Lilly',
      role: 'uploader',
      password: hashedPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: 'pamela@elmarmaintenance.com' },
    update: {
      password: hashedPassword,
      name: 'Pamela',
      role: 'reviewer',
    },
    create: {
      email: 'pamela@elmarmaintenance.com',
      name: 'Pamela',
      role: 'reviewer',
      password: hashedPassword,
    },
  });

  // Create default settings
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {
      uploaderEmail: 'lilly@elmarmaintenance.com',
      reviewerEmail: 'pamela@elmarmaintenance.com',
    },
    create: {
      id: 'default',
      uploaderEmail: 'lilly@elmarmaintenance.com',
      reviewerEmail: 'pamela@elmarmaintenance.com',
    },
  });

  console.log('✅ Database seeded successfully');
  console.log('📧 Uploader: lilly@elmarmaintenance.com / Elmar@2025');
  console.log('📧 Reviewer: pamela@elmarmaintenance.com / Elmar@2025');
  console.log('💡 Wijzig deze credentials via Settings in de app!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
