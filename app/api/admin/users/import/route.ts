import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { createAccount } from "@/lib/account-creation";
import { GRHA_LIST } from "@/lib/constants";
import type { Grha, Role } from "@prisma/client";

const ROLE_MAP: Record<string, Role> = {
  SISWA: "STUDENT",
  STUDENT: "STUDENT",
  "MATTA/PITTA": "STAFF",
  MATTA: "STAFF",
  PITTA: "STAFF",
  STAFF: "STAFF",
  ADMIN: "ADMIN",
};

const GRHA_SET = new Set<string>(GRHA_LIST);

type ImportResult = {
  row: number;
  fullName: string;
  status: "created" | "error";
  username?: string;
  plainPassword?: string;
  role?: Role;
  grha?: string;
  error?: string;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File Excel wajib diunggah" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, unknown>[];
  try {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) throw new Error("File tidak punya sheet");
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheet], {
      defval: "",
      raw: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "File Excel tidak valid";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const results: ImportResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // header row assumed at row 1
    const fullName = String(row["Full Name"] ?? row["Nama Lengkap"] ?? "").trim();
    const roleRaw = String(row["Role"] ?? row["Peran"] ?? "").trim().toUpperCase();
    const grhaRaw = String(row["Grha"] ?? "").trim().toUpperCase();

    if (!fullName) {
      results.push({ row: rowNumber, fullName: "", status: "error", error: "Nama lengkap kosong" });
      continue;
    }

    const role = ROLE_MAP[roleRaw];
    if (!role) {
      results.push({
        row: rowNumber,
        fullName,
        status: "error",
        error: `Peran tidak dikenal: '${roleRaw}'. Gunakan Siswa / Matta/Pitta / Admin.`,
      });
      continue;
    }

    let grha: Grha | undefined;
    if (role !== "ADMIN") {
      if (!GRHA_SET.has(grhaRaw)) {
        results.push({
          row: rowNumber,
          fullName,
          status: "error",
          error: `Grha tidak valid: '${grhaRaw}'. Pilihan: ${GRHA_LIST.join(", ")}`,
        });
        continue;
      }
      grha = grhaRaw as Grha;
    }

    try {
      const created = await createAccount({ fullName, role, grha });
      results.push({
        row: rowNumber,
        fullName,
        status: "created",
        username: created.username,
        plainPassword: created.plainPassword,
        role,
        grha,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal membuat akun";
      results.push({ row: rowNumber, fullName, status: "error", error: message });
    }
  }

  return NextResponse.json({ results });
}
