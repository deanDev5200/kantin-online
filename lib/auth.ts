import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { getSession, type SessionPayload } from "./session";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(allowed: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) redirect("/login");
  return session;
}

export async function requireStudent() {
  const session = await requireRole(["STUDENT"]);
  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: { user: true },
  });
  if (!student) redirect("/login");
  return { session, student };
}

export async function requireStaff() {
  const session = await requireRole(["STAFF"]);
  const staff = await prisma.staff.findUnique({
    where: { userId: session.userId },
    include: { user: true },
  });
  if (!staff) redirect("/login");
  return { session, staff };
}

export async function requireAdmin(): Promise<SessionPayload> {
  return requireRole(["ADMIN"]);
}
