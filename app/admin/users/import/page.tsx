"use client";

import { useState } from "react";
import Link from "next/link";
import { GRHA_LABELS } from "@/lib/constants";
import type { Grha } from "@prisma/client";

type ImportResult = {
  row: number;
  fullName: string;
  status: "created" | "error";
  username?: string;
  plainPassword?: string;
  role?: "STUDENT" | "STAFF" | "ADMIN";
  grha?: Grha;
  error?: string;
};

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Siswa",
  STAFF: "Matta/Pitta",
  ADMIN: "Admin",
};

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih file Excel dulu");
      return;
    }
    setBusy(true);
    setError(null);
    setResults(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/users/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengimpor");
      return;
    }
    setResults(data.results);
  }

  const created = results?.filter((r) => r.status === "created") ?? [];
  const failed = results?.filter((r) => r.status === "error") ?? [];

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-sm text-primary hover:underline">
        &lt;- Kembali ke daftar pengguna
      </Link>

      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-1">Impor Pengguna dari Excel</h2>
        <p className="kc-muted mb-4">
          Kolom yang dibutuhkan: <strong>Full Name</strong>, <strong>Role</strong> (Siswa / Matta\/Pitta / Admin),
          dan <strong>Grha</strong> (wajib untuk Siswa dan Matta/Pitta).
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download endpoint, not a page */}
        <a href="/api/admin/users/import/template" className="kc-btn kc-btn-secondary">
          Unduh Template
        </a>
      </section>

      <form onSubmit={upload} className="kc-card p-5 space-y-4">
        <div>
          <label className="kc-label">File Excel (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx"
            className="kc-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error && <p className="kc-error">{error}</p>}
        <button className="kc-btn kc-btn-primary" disabled={busy || !file}>
          {busy ? "Mengimpor..." : "Impor"}
        </button>
      </form>

      {results && (
        <section className="kc-card p-5">
          <h3 className="text-lg font-semibold mb-1">Hasil Impor</h3>
          <p className="kc-muted mb-3">
            Berhasil: {created.length} &bull; Gagal: {failed.length}
          </p>

          {failed.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-danger mb-2">Gagal</h4>
              <ul className="text-sm space-y-1">
                {failed.map((r) => (
                  <li key={r.row}>
                    Baris {r.row} ({r.fullName || "-"}): {r.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {created.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Akun berhasil dibuat (salin sekarang)</h4>
              <div className="overflow-x-auto">
                <table className="kc-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Peran</th>
                      <th>Grha</th>
                      <th>Username</th>
                      <th>Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {created.map((r) => (
                      <tr key={r.row}>
                        <td>{r.fullName}</td>
                        <td>{ROLE_LABEL[r.role ?? ""] ?? "-"}</td>
                        <td>{r.grha ? GRHA_LABELS[r.grha] : "-"}</td>
                        <td className="font-mono text-xs">{r.username}</td>
                        <td className="font-mono text-xs">{r.plainPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="kc-muted mt-2">
                Password hanya ditampilkan sekali di halaman ini. Salin sebelum meninggalkan halaman.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
