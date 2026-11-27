import { Role } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function syncCurrentUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error(`Unable to load Clerk user ${userId}`);
  }

  const email = clerkUser.primaryEmailAddress?.emailAddress;
  if (!email) {
    throw new Error(`Clerk user ${userId} does not have a primary email address`);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const role =
    adminEmail && normalizedEmail === adminEmail ? Role.ADMIN : Role.USER;
  const name = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ") || null;

  return prisma.user.upsert({
    where: { clerkUserId: userId },
    create: {
      clerkUserId: userId,
      email: normalizedEmail,
      name,
      role,
    },
    update: {
      email: normalizedEmail,
      name,
      role,
    },
  });
}
