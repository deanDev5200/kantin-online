import { NextResponse } from "next/server";
import { destroyUserSession } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST() {
  // Audit before destroying the session so the actor can be resolved.
  await audit({ action: "auth.logout" });
  await destroyUserSession();
  return NextResponse.json({ ok: true });
}
