/**
 * DATABASE SEED SCRIPT
 * Creates the initial Principal account for the QR Attendance System.
 *
 * Usage:
 *   node prisma/seed.js
 *
 * You can change the email and password below before running.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// ✏️  CHANGE THESE BEFORE RUNNING
// ─────────────────────────────────────────────
const PRINCIPAL_FIRST_NAME = 'Admin';
const PRINCIPAL_LAST_NAME  = 'Principal';
const PRINCIPAL_EMAIL      = 'principal@abcuniversity.edu.in';
const PRINCIPAL_PASSWORD   = 'Principal@123';   // min 8 chars, 1 upper, 1 lower, 1 digit
// ─────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...\n');

  // Check if principal already exists
  const existing = await prisma.user.findUnique({
    where: { email: PRINCIPAL_EMAIL },
  });

  if (existing) {
    console.log(`⚠️  User with email "${PRINCIPAL_EMAIL}" already exists.`);
    console.log('   Delete or change the email in seed.js and re-run if needed.');
    return;
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(PRINCIPAL_PASSWORD, 12);

  // Create the Principal user
  const principal = await prisma.user.create({
    data: {
      email:             PRINCIPAL_EMAIL,
      passwordHash,
      firstName:         PRINCIPAL_FIRST_NAME,
      lastName:          PRINCIPAL_LAST_NAME,
      role:              'PRINCIPAL',
      isActive:          true,
      mustChangePassword: false,
    },
  });

  console.log('✅ Principal account created successfully!\n');
  console.log('─────────────────────────────────────────');
  console.log(`   Name    : ${principal.firstName} ${principal.lastName}`);
  console.log(`   Email   : ${principal.email}`);
  console.log(`   Password: ${PRINCIPAL_PASSWORD}`);
  console.log(`   Role    : ${principal.role}`);
  console.log('─────────────────────────────────────────');
  console.log('\n👉 Use these credentials to log in at POST /api/v1/auth/login');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
