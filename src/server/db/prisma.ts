import { PrismaClient } from '@prisma/client';

type PrismaGlobal = typeof globalThis & {
  __careerMatchPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export const prisma = prismaGlobal.__careerMatchPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  prismaGlobal.__careerMatchPrisma = prisma;
}
