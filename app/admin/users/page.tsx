"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GRHA_LIST, GRHA_LABELS } from "@/lib/constants";
import type { Grha } from "@prisma/client";

type AdminUser = {
  id: string;
  username: string;
  fullName: string;
  role: "STUDENT" | "STAFF" | "ADMIN";
  createdAt: string;
  student: { grha: Grha; cardStatus: string } | null;
  staff: { grha: Grha } | null;
};

const ROLE_LABEL: Record<AdminUser["role"], string> = {
  STUDENT: "Siswa",
  STAFF: "Matta/Pitta",
  ADMIN: "Admin",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | AdminUser["role"]>("");
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ username: string; plainPassword: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (roleFilter) params.set("role", roleFilter);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal memuat data");
      return;
    }
    setUsers(data.users);
  }, [q, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Hapus akun ${u.fullName} (${u.username})? Tindakan ini tidak bisa dibatalkan.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Gagal menghapus");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Kelola Pengguna</h2>
        <div className="flex gap-2">
          <Link href="/admin/users/import" className="kc-btn kc-btn-secondary">
            Impor Excel
          </Link>
          <button className="kc-btn kc-btn-primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Batal" : "Tambah Pengguna"}
          </button>
        </div>
      </div>

      {lastCreated && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm">
          <p className="font-semibold mb-1">Akun berhasil dibuat:</p>
          <p>
            Username: <span className="font-mono">{lastCreated.username}</span>
          </p>
          <p>
            Password: <span className="font-mono">{lastCreated.plainPassword}</span>
          </p>
          <p className="kc-muted mt-1">
            Salin dan berikan password ini ke pengguna. Password tidak akan ditampilkan lagi.
          </p>
          <button
            type="button"
            className="kc-btn kc-btn-secondary mt-2"
            onClick={() => setLastCreated(null)}
          >
            Tutup
          </button>
        </div>
      )}

      {showCreate && (
        <CreateUserCard
          onCreated={(created) => {
            setLastCreated(created);
            load();
          }}
        />
      )}

      <div className="kc-card p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="kc-label">Cari</label>
          <input
            className="kc-input"
            placeholder="Nama atau username"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className="kc-label">Peran</label>
          <select
            className="kc-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          >
            <option value="">Semua</option>
            <option value="STUDENT">Siswa</option>
            <option value="STAFF">Matta/Pitta</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {error && <p className="kc-error">{error}</p>}

      <div className="kc-card p-4 overflow-x-auto">
        {loading ? (
          <p className="kc-muted">Memuat...</p>
        ) : users.length === 0 ? (
          <p className="kc-muted">Tidak ada pengguna.</p>
        ) : (
          <table className="kc-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Peran</th>
                <th>Grha</th>
                <th>Kartu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.fullName}</td>
                  <td className="font-mono text-xs">{u.username}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.student ? GRHA_LABELS[u.student.grha] : u.staff ? GRHA_LABELS[u.staff.grha] : "-"}</td>
                  <td>
                    {u.student ? (
                      u.student.cardStatus === "ACTIVE" ? (
                        <span className="kc-badge kc-badge-active">Aktif</span>
                      ) : (
                        <span className="kc-badge kc-badge-blocked">Diblokir</span>
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-primary hover:underline text-sm font-medium mr-3"
                    >
                      Detail
                    </Link>
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-danger hover:underline text-sm font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CreateUserCard({
  onCreated,
}: {
  onCreated: (created: { username: string; plainPassword: string }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "STAFF" | "ADMIN">("STUDENT");
  const [grha, setGrha] = useState<Grha>("AIRSANYA");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        role,
        grha: role === "ADMIN" ? undefined : grha,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat akun");
      return;
    }
    setFullName("");
    onCreated({ username: data.username, plainPassword: data.plainPassword });
  }

  return (
    <form onSubmit={submit} className="kc-card p-5 space-y-4">
      <h3 className="font-semibold">Tambah Pengguna</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3">
          <label className="kc-label">Nama Lengkap</label>
          <input
            className="kc-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="kc-label">Peran</label>
          <select
            className="kc-input"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="STUDENT">Siswa</option>
            <option value="STAFF">Matta/Pitta</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {role !== "ADMIN" && (
          <div>
            <label className="kc-label">Grha</label>
            <select
              className="kc-input"
              value={grha}
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
      {error && <p className="kc-error">{error}</p>}
      <button className="kc-btn kc-btn-primary" disabled={busy}>
        {busy ? "Menyimpan..." : "Buat Akun"}
      </button>
    </form>
  );
}
