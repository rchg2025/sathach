import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Nsg@2026', 10);
  
  // Upsert to ensure it doesn't fail if exists
  let admin = await prisma.user.findUnique({ where: { username: 'quantri' } });
  if (admin) {
    admin = await prisma.user.update({
      where: { username: 'quantri' },
      data: {
        password: passwordHash,
        role: 'ADMIN',
        fullName: 'Quản Trị Viên Root'
      }
    });
  } else {
    admin = await prisma.user.create({
      data: {
        username: 'quantri',
        password: passwordHash,
        role: 'ADMIN',
        fullName: 'Quản Trị Viên Root'
      }
    });
  }

  console.log('Root Admin user created/updated:', admin.username);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
