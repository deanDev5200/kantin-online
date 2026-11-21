"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuditLogFilters({
  initialAction,
  initialActor,
  initialQ,
  initialFrom,
  initialTo,
}: {
  initialAction: string;
  initialActor: string;
  initialQ: string;
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState(initialAction);
  const [actor, setActor] = useState(initialActor);
  const [q, setQ] = useState(initialQ);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (action.trim()) params.set("action", action.trim());
    if (actor.trim()) params.set("actor", actor.trim());
    if (q.trim()) params.set("q", q.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", "1");
    router.push(`/admin/logs?${params.toString()}`);
  }

  function reset() {
    setAction("");
    setActor("");
    setQ("");
    setFrom("");
    setTo("");
    router.push("/admin/logs");
  }

  return (
    <form onSubmit={apply} className="kc-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end">
      <div>
        <label className="kc-label">Aksi</label>
        <input
          className="kc-input"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="cth: cashier.pay"
        />
      </div>
      <div>
        <label className="kc-label">Aktor</label>
        <input
          className="kc-input"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="username / CASHIER"
        />
      </div>
      <div>
        <label className="kc-label">Entitas ID</label>
        <input
          className="kc-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="entity id"
        />
      </div>
      <div>
        <label className="kc-label">Dari</label>
        <input type="date" className="kc-input" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <label className="kc-label">Sampai</label>
        <input type="date" className="kc-input" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="kc-btn kc-btn-primary flex-1">
          Terapkan
        </button>
        <button type="button" className="kc-btn kc-btn-secondary" onClick={reset}>
          Reset
        </button>
      </div>
    </form>
  );
}
