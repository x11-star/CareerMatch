import { Prisma } from '@prisma/client';

export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class UniqueConstraintError extends DatabaseError {
  constructor(public readonly target: string[], cause?: unknown) {
    super(`Unique constraint failed: ${target.join(', ')}`, cause);
    this.name = 'UniqueConstraintError';
  }
}

export class RecordNotFoundError extends DatabaseError {
  constructor(message = 'Record not found', cause?: unknown) {
    super(message, cause);
    this.name = 'RecordNotFoundError';
  }
}

function getTarget(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target;
  return Array.isArray(target) ? target.map(String) : [];
}

export function mapPrismaError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new UniqueConstraintError(getTarget(error), error);
    }

    if (error.code === 'P2025') {
      return new RecordNotFoundError('Record not found', error);
    }
  }

  return new DatabaseError('Database operation failed', error);
}

export async function runDb<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPrismaError(error);
  }
}
