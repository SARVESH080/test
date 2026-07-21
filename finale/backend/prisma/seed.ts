/**
 * Seeds a fixed demo account so the app can be smoke-tested locally without
 * clicking through the sign-up flow.
 *
 *   npx prisma db seed
 *
 * Credentials (also referenced by the frontend's dev auto-login):
 *   email:    demo@example.com
 *   password: password123
 *
 * Safe to run repeatedly (upsert). Do NOT run this against a production
 * database — it exists purely for local/dev testing.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      displayName: 'Demo Reader',
      provider: 'EMAIL',
    },
  });

  console.log(`Seeded demo user: ${user.email} (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
