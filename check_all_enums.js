import 'dotenv/config';
import { prisma } from './src/lib/prisma.js';

async function main() {
  const res = await prisma.$queryRawUnsafe(
    `SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumsortorder`
  );
  console.log('ALL ENUMS IN POSTGRESQL:', JSON.stringify(res, null, 2));
  process.exit(0);
}

main().catch(console.error);
