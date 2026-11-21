import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action")?.trim() || undefined;
  const actor = url.searchParams.get("actor")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const from = url.searchParams.get("from")?.trim() || undefined;
  const to = url.searchParams.get("to")?.trim() || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "50") || 50));

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (actor) where.actorLabel = { contains: actor, mode: "insensitive" };
  if (q) {
    where.OR = [
      { entityId: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
    ];
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize });
}
