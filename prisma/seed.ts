import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default users - wachtwoord: Elmar@2025
  const hashedPassword = await bcrypt.hash('Elmar@2025', 10);

  await prisma.user.upsert({
    where: { email: 'lilly@elmarmaintenance.com' },
    update: { password: hashedPassword, name: 'Lilly', role: 'uploader' },
    create: { email: 'lilly@elmarmaintenance.com', name: 'Lilly', role: 'uploader', password: hashedPassword },
  });

  await prisma.user.upsert({
    where: { email: 'pamela@elmarmaintenance.com' },
    update: { password: hashedPassword, name: 'Pamela', role: 'uploader' },
    create: { email: 'pamela@elmarmaintenance.com', name: 'Pamela', role: 'uploader', password: hashedPassword },
  });

  await prisma.user.upsert({
    where: { email: 'brahim@elmarservices.com' },
    update: { password: hashedPassword, name: 'Brahim', role: 'reviewer' },
    create: { email: 'brahim@elmarservices.com', name: 'Brahim', role: 'reviewer', password: hashedPassword },
  });

  // Create default settings
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {
      uploaderEmail: 'lilly@elmarmaintenance.com',
      reviewerEmail: 'brahim@elmarservices.com',
    },
    create: {
      id: 'default',
      uploaderEmail: 'lilly@elmarmaintenance.com',
      reviewerEmail: 'brahim@elmarservices.com',
    },
  });

  console.log('✅ Database seeded successfully');
  console.log('📧 Uploader:  lilly@elmarmaintenance.com / Elmar@2025');
  console.log('📧 Uploader:  pamela@elmarmaintenance.com / Elmar@2025');
  console.log('📧 Reviewer:  brahim@elmarservices.com / Elmar@2025');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
