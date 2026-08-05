import { pathToFileURL } from 'node:url';
import { Prisma } from '@prisma/client';
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

export async function seedPositions(): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const position of MOCK_POSITIONS) {
    const existing = await prisma.position.findUnique({
      where: {
        company_title_city: {
          company: position.company,
          title: position.title,
          city: position.city,
        },
      },
      select: { id: true },
    });

    await prisma.position.upsert(mapPositionForSeed(position));

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
    const result = await seedPositions();
    console.log(`Seeded positions: created ${result.created}, updated ${result.updated}`);
  } finally {
    await prisma.$disconnect();
  }
}
