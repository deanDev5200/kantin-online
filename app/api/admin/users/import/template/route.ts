import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new Response("Tidak terautentikasi", { status: 401 });
  }

  const rows = [
    { "Full Name": "Budi Santoso", Role: "Siswa", Grha: "Airsanya" },
    { "Full Name": "Ibu Sari", Role: "Matta/Pitta", Grha: "Daksina" },
    { "Full Name": "Administrator 2", Role: "Admin", Grha: "" },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="kantin-canggih-user-template.xlsx"',
    },
  });
}
