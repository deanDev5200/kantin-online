import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { AuditLogFilters } from "@/components/audit-log-filters";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  action?: string;
  actor?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

function formatDateTime(d: Date): string {
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" });
}

function metaPreview(meta: unknown): string {
  if (meta == null) return "-";
  try {
    const s = JSON.stringify(meta);
    return s.length > 80 ? s.slice(0, 77) + "..." : s;
  } catch {
    return "-";
  }
}

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const action = sp.action?.trim() || undefined;
  const actor = sp.actor?.trim() || undefined;
  const q = sp.q?.trim() || undefined;
  const from = sp.from?.trim() || undefined;
  const to = sp.to?.trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(target));
    return `/admin/logs?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Log Aktivitas</h2>
          <p className="kc-muted">Jejak audit keamanan dan sengketa. {total} entri.</p>
        </div>
      </div>

      <AuditLogFilters
        initialAction={action ?? ""}
        initialActor={actor ?? ""}
        initialQ={q ?? ""}
        initialFrom={from ?? ""}
        initialTo={to ?? ""}
      />

      <div className="kc-card p-4 overflow-x-auto">
        {logs.length === 0 ? (
          <p className="kc-muted">Tidak ada log untuk filter ini.</p>
        ) : (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aksi</th>
                <th>Aktor</th>
                <th>Entitas</th>
                <th>Detail</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</td>
                  <td className="font-mono text-xs">{log.action}</td>
                  <td className="text-xs">
                    {log.actorLabel ?? "-"}
                    {log.actorRole ? (
                      <span className="kc-muted"> ({log.actorRole})</span>
                    ) : null}
                  </td>
                  <td className="text-xs">
                    {log.entityType ?? "-"}
                    {log.entityId ? (
                      <span className="kc-muted font-mono"> {log.entityId.slice(0, 10)}</span>
                    ) : null}
                  </td>
                  <td className="text-xs font-mono break-all">{metaPreview(log.metadata)}</td>
                  <td className="text-xs font-mono">{log.ip ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="kc-muted text-sm">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={pageHref(page - 1)} className="kc-btn kc-btn-secondary">
                Sebelumnya
              </a>
            )}
            {page < totalPages && (
              <a href={pageHref(page + 1)} className="kc-btn kc-btn-secondary">
                Berikutnya
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
