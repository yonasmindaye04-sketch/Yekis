import { prisma } from "./src/lib/prisma.js";

async function main() {
  const u = await prisma.user.update({
    where: { email: "emushu70@gmail.con" },
    data: { email: "emushu70@gmail.com" },
  });
  console.log("fixed:", u.email);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
