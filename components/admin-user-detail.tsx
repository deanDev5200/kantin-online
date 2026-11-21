"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GRHA_LIST, GRHA_LABELS } from "@/lib/constants";
import type { Grha } from "@prisma/client";

type DetailUser = {
  id: string;
  username: string;
  fullName: string;
  role: "STUDENT" | "STAFF" | "ADMIN";
  createdAt: string;
  grha: Grha | null;
  student: {
    id: string;
    cardUid: string | null;
    cardStatus: "ACTIVE" | "BLOCKED";
    cardBlockReason: "MANUAL" | "PIN_ATTEMPTS" | null;
    hasPin: boolean;
    monthlyLimitRupiah: number | null;
  } | null;
};

const ROLE_LABEL: Record<DetailUser["role"], string> = {
  STUDENT: "Siswa",
  STAFF: "Matta/Pitta",
  ADMIN: "Admin",
};

export function AdminUserDetail({ user }: { user: DetailUser }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName);
  const [grha, setGrha] = useState<Grha | null>(user.grha);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetPassword, setResetPassword] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        grha: user.role === "ADMIN" ? undefined : grha ?? undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan");
      return;
    }
    setInfo("Perubahan disimpan.");
    router.refresh();
  }

  async function doResetPassword() {
    if (!confirm(`Reset password ${user.fullName}? Password baru akan ditampilkan sekali.`)) return;
    setBusy(true);
    setError(null);
    setResetPassword(null);
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal reset password");
      return;
    }
    setResetPassword(data.plainPassword);
  }

  return (
    <div className="space-y-4">
      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-3">Data Diri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="kc-label">Nama Lengkap</label>
            <input className="kc-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="kc-label">Username</label>
            <input className="kc-input font-mono bg-gray-50" value={user.username} readOnly />
          </div>
          <div>
            <label className="kc-label">Peran</label>
            <input className="kc-input bg-gray-50" value={ROLE_LABEL[user.role]} readOnly />
          </div>
          {user.role !== "ADMIN" && (
            <div>
              <label className="kc-label">Grha</label>
              <select
                className="kc-input"
                value={grha ?? "AIRSANYA"}
                onChange={(e) => setGrha(e.target.value as Grha)}
              >
                {GRHA_LIST.map((g) => (
                  <option key={g} value={g}>
                    {GRHA_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {error && <p className="kc-error mt-3">{error}</p>}
        {info && <p className="text-sm text-success mt-3">{info}</p>}
        <div className="mt-4 flex gap-2">
          <button className="kc-btn kc-btn-primary" onClick={save} disabled={busy}>
            Simpan Perubahan
          </button>
          <button className="kc-btn kc-btn-secondary" onClick={doResetPassword} disabled={busy}>
            Reset Password
          </button>
        </div>
        {resetPassword && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm mt-3">
            <p className="font-semibold mb-1">Password baru:</p>
            <p className="font-mono text-lg">{resetPassword}</p>
            <p className="kc-muted mt-1">
              Salin dan berikan ke pengguna. Password tidak akan ditampilkan lagi.
            </p>
          </div>
        )}
      </section>

      {user.student && (
        <StudentCardPanel studentId={user.student.id} student={user.student} onChanged={() => router.refresh()} />
      )}
    </div>
  );
}

function StudentCardPanel({
  studentId,
  student,
  onChanged,
}: {
  studentId: string;
  student: NonNullable<DetailUser["student"]>;
  onChanged: () => void;
}) {
  const [cardUid, setCardUid] = useState(student.cardUid ?? "");
  const [limit, setLimit] = useState(
    student.monthlyLimitRupiah == null ? "" : String(student.monthlyLimitRupiah),
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveCard() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardUid: cardUid.trim() || undefined,
        monthlyLimitRupiah: limit.trim() === "" ? null : Number(limit.replace(/[^0-9]/g, "")),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan data kartu");
      return;
    }
    setInfo("Data kartu disimpan.");
    onChanged();
  }

  async function setStatus(action: "block" | "unblock") {
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/admin/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardStatus: action === "block" ? "BLOCKED" : "ACTIVE" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengubah status kartu");
      return;
    }
    onChanged();
  }

  return (
    <section className="kc-card p-5">
      <h2 className="text-lg font-semibold mb-3">Kartu RFID</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="kc-label">UID Kartu</label>
          <input
            className="kc-input font-mono"
            value={cardUid}
            onChange={(e) => setCardUid(e.target.value)}
            placeholder="Belum ditautkan"
          />
        </div>
        <div>
          <label className="kc-label">Limit Bulanan (Rp, kosong = tanpa limit)</label>
          <input
            className="kc-input"
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="Tanpa limit"
          />
        </div>
      </div>
      <p className="kc-muted mt-2">
        Status: {student.cardStatus === "ACTIVE" ? "Aktif" : "Diblokir"}
        {student.hasPin ? " - PIN sudah dibuat" : " - PIN belum dibuat"}
      </p>
      {error && <p className="kc-error mt-3">{error}</p>}
      {info && <p className="text-sm text-success mt-3">{info}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="kc-btn kc-btn-primary" onClick={saveCard} disabled={busy}>
          Simpan Kartu
        </button>
        {student.cardStatus === "ACTIVE" ? (
          <button className="kc-btn kc-btn-danger" onClick={() => setStatus("block")} disabled={busy}>
            Blokir Kartu
          </button>
        ) : (
          <button className="kc-btn kc-btn-secondary" onClick={() => setStatus("unblock")} disabled={busy}>
            Buka Blokir
          </button>
        )}
      </div>
    </section>
  );
}
