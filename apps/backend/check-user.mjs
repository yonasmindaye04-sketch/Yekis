import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

const email = "emushu70@gmail.com";

const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    createdAt: true,
    passwordHash: true,
    isSuspended: true,
    staffRole: true,
    kyc: { select: { status: true, tier: true } },
  },
});

if (!user) {
  console.log("NO USER FOUND with email", email);
  const similar = await prisma.user.findMany({
    where: { email: { contains: "emushu" } },
    select: { email: true, createdAt: true },
  });
  console.log("similar:", similar);
} else {
  console.log(JSON.stringify({
    ...user,
    passwordHash: user.passwordHash ? `(len ${user.passwordHash.length}, argon2=${user.passwordHash.startsWith("$argon2")})` : null,
  }, null, 2));
}

const total = await prisma.user.count();
console.log("total users in DB:", total);
process.exit(0);
