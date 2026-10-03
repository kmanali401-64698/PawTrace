import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

function createClient() {
    // Plain JS Postgres driver: works on Vercel without Prisma's native engine binary
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in dev so we don't exhaust Neon's connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
