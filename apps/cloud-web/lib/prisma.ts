import { PrismaClient } from "@prisma/client";

const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") {
  globalPrisma.prisma = prisma;
}
