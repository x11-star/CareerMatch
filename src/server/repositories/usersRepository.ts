import type { Prisma } from '@prisma/client';
import { runDb } from '../db/errors';
import { prisma } from '../db/prisma';

export type CreateUserInput = Pick<Prisma.UserCreateInput, 'phone' | 'name' | 'school' | 'major' | 'graduationYear'>;
export type UpdateUserProfileInput = Pick<Prisma.UserUpdateInput, 'name' | 'school' | 'major' | 'graduationYear'>;

export function findUserByPhone(phone: string) {
  return runDb(() => prisma.user.findUnique({ where: { phone } }));
}

export function findUserById(userId: string) {
  return runDb(() => prisma.user.findUnique({ where: { id: userId } }));
}

export function createUser(input: CreateUserInput) {
  return runDb(() => prisma.user.create({ data: input }));
}

export function upsertUserByPhone(input: CreateUserInput) {
  return runDb(() => prisma.user.upsert({
    where: { phone: input.phone },
    create: input,
    update: {
      name: input.name,
      school: input.school,
      major: input.major,
      graduationYear: input.graduationYear,
    },
  }));
}

export function updateUserProfile(userId: string, input: UpdateUserProfileInput) {
  return runDb(() => prisma.user.update({ where: { id: userId }, data: input }));
}

export function updateUserPhone(userId: string, phone: string) {
  return runDb(() => prisma.user.update({ where: { id: userId }, data: { phone } }));
}

export function deleteUser(userId: string) {
  return runDb(() => prisma.user.delete({ where: { id: userId } }));
}
