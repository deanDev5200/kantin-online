import { headers } from "next/headers";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "./db";
import { getSession, getCashierSession } from "./session";
import { logger } from "./logger";

export type AuditInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  /** Override actor for flows that have no user session (e.g. cashier). */
  actorLabel?: string;
  actorRole?: Role | null;
};

async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip");
    return { ip, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/**
 * Record an audit-log entry. Never throws: a failed audit write must not break
 * the user's action. Logs the failure to the server error log instead.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const [session, ctx] = await Promise.all([getSession(), requestContext()]);

    let actorUserId: string | null = null;
    let actorRole: Role | null = input.actorRole ?? null;
    let actorLabel: string | null = input.actorLabel ?? null;

    if (session) {
      actorUserId = session.userId;
      actorRole = input.actorRole ?? session.role;
      actorLabel = input.actorLabel ?? session.username;
    } else if (!actorLabel) {
      // Fall back to cashier identity when a cashier session exists.
      const isCashier = await getCashierSession().catch(() => false);
      if (isCashier) actorLabel = "CASHIER";
    }

    await prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole,
        actorLabel,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
  } catch (err) {
    logger.error("audit.write_failed", { action: input.action, error: String(err) });
  }
}
