import { pathToFileURL } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';
import { MOCK_POSITIONS } from '../src/data';
import type { Position } from '../src/types';
import { prisma } from '../src/server/db/prisma';

export function mapPositionForSeed(position: Position): Prisma.PositionUpsertArgs {
  const data = {
    title: position.title,
    company: position.company,
    city: position.city,
    type: position.type,
    industry: position.industry ?? null,
    category: position.category ?? null,
    subIndustry: position.subIndustry ?? null,
    subCategory: position.subCategory ?? null,
    salaryRange: position.salaryRange ?? null,
    difficultyRating: String(position.difficultyRating ?? ''),
    tags: position.tags,
    summary: position.summary,
    responsibilities: position.responsibilities,
    requirements: position.requirements,
    softSkills: position.softSkills,
    salaryDetail: position.salaryDetail ?? null,
    careerPath: position.careerPath,
    fitPersonality: position.fitPersonality,
    howToPrepare: position.howToPrepare,
    relatedJobs: position.relatedJobs,
  } satisfies Prisma.PositionUncheckedCreateInput;

  return {
    where: {
      company_title_city: {
        company: position.company,
        title: position.title,
        city: position.city,
      },
    },
    create: data,
    update: data,
  };
}

export async function seedPositions(client: Prisma.TransactionClient = prisma): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const position of MOCK_POSITIONS) {
    const existing = await client.position.findUnique({
      where: {
        company_title_city: {
          company: position.company,
          title: position.title,
          city: position.city,
        },
      },
      select: { id: true },
    });

    await client.position.upsert(mapPositionForSeed(position));

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return { created, updated };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.includes('--reset')) {
      // Clear old position data (and FK dependents) before re-seeding, so stale rows from a
      // previous seed (e.g. the old fake 346) don't accumulate alongside the new 346.
      // Run inside a transaction with the seed so a seed failure rolls back the clears (otherwise
      // a partial seed would leave the DB empty).
      // WARNING: --reset deletes ALL users' favorites and match results, not just old positions.
      // Run on a fresh dev DB or accept the loss.
      const result = await prisma.$transaction(async (tx) => {
        await tx.matchResult.deleteMany();
        await tx.favorite.deleteMany();
        await tx.position.deleteMany();
        return seedPositions(tx);
      });
      console.log('Reset: cleared tables, then ' +
        `Seeded positions: created ${result.created}, updated ${result.updated}`);
    } else {
      const result = await seedPositions();
      console.log(`Seeded positions: created ${result.created}, updated ${result.updated}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
