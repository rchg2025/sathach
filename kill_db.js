const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://neondb_owner:npg_zPotuN5FD4Xj@ep-silent-term-ai3slpw9.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require" } } });
prisma.$executeRawUnsafe(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'neondb' AND pid != pg_backend_pid();`)
  .then(() => console.log('Connections killed'))
  .catch(console.error)
  .finally(() => process.exit(0));
