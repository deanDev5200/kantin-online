import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "STUDENT") redirect("/siswa");
  if (session.role === "STAFF") redirect("/staff");
  if (session.role === "ADMIN") redirect("/admin");

  redirect("/login");
}
