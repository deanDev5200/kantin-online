"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { setCardPinSchema } from "@/lib/validation";
import { Badge, Field, SubmitButton } from "./ui";

type PinForm = z.infer<typeof setCardPinSchema>;

type CardState = {
  cardUid: string | null;
  status: "ACTIVE" | "BLOCKED";
  blockReason: "MANUAL" | "PIN_ATTEMPTS" | null;
  hasPin: boolean;
  pinAttempts: number;
};

export function StudentCardManager({ initial }: { initial: CardState }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PinForm>({ resolver: zodResolver(setCardPinSchema) });

  async function setPin(values: PinForm) {
    setError(null);
    setInfo(null);
    const res = await fetch("/api/student/card/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan PIN");
      return;
    }
    setInfo("PIN kartu berhasil disimpan.");
    reset({ pin: "", confirmPin: "" });
    router.refresh();
  }

  async function changeStatus(action: "block" | "unblock") {
    setError(null);
    setInfo(null);
    if (action === "block" && !confirm("Blokir kartu? Kamu tidak bisa membayar sampai kartu dibuka blokirnya.")) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/student/card/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengubah status kartu");
      return;
    }
    setInfo(action === "block" ? "Kartu diblokir." : "Blokir kartu dibuka.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kc-card p-4">
          <p className="kc-muted">UID Kartu</p>
          <p className="font-mono text-lg">{initial.cardUid ?? "Belum ditautkan"}</p>
        </div>
        <div className="kc-card p-4">
          <p className="kc-muted">Status</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={initial.status === "ACTIVE" ? "active" : "blocked"}>
              {initial.status === "ACTIVE" ? "Aktif" : "Diblokir"}
            </Badge>
            {initial.status === "BLOCKED" && (
              <span className="kc-muted">
                {initial.blockReason === "PIN_ATTEMPTS" ? "Karena salah PIN 5x" : "Diblokir manual"}
              </span>
            )}
          </div>
          {initial.pinAttempts > 0 && initial.status === "ACTIVE" && (
            <p className="kc-muted mt-1">Percobaan PIN salah: {initial.pinAttempts}/5</p>
          )}
        </div>
      </div>

      {error && <p className="kc-error">{error}</p>}
      {info && <p className="text-sm text-success">{info}</p>}

      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-1">
          {initial.hasPin ? "Ubah PIN Kartu" : "Buat PIN Kartu"}
        </h2>
        <p className="kc-muted mb-4">PIN dipakai saat membayar di kasir Business Center.</p>
        <form onSubmit={handleSubmit(setPin)} className="space-y-4 max-w-sm">
          <Field label="PIN (6 digit angka)" htmlFor="pin" error={errors.pin?.message}>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              autoComplete="new-password"
              className="kc-input font-mono tracking-widest"
              {...register("pin")}
            />
          </Field>
          <Field label="Konfirmasi PIN" htmlFor="confirmPin" error={errors.confirmPin?.message}>
            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              autoComplete="new-password"
              className="kc-input font-mono tracking-widest"
              {...register("confirmPin")}
            />
          </Field>
          <SubmitButton disabled={!initial.cardUid}>
            {initial.hasPin ? "Ubah PIN" : "Simpan PIN"}
          </SubmitButton>
          {!initial.cardUid && (
            <p className="kc-muted">PIN hanya dapat dibuat setelah admin menautkan kartu RFID.</p>
          )}
        </form>
      </section>

      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-1">Blokir Kartu</h2>
        <p className="kc-muted mb-4">
          Jika kartu hilang atau dicurigai disalahgunakan, blokir kartu agar tidak bisa dipakai membayar.
        </p>
        {initial.status === "ACTIVE" ? (
          <button className="kc-btn kc-btn-danger" onClick={() => changeStatus("block")} disabled={busy}>
            Blokir Kartu
          </button>
        ) : (
          <button className="kc-btn kc-btn-primary" onClick={() => changeStatus("unblock")} disabled={busy}>
            Buka Blokir Kartu
          </button>
        )}
      </section>
    </div>
  );
}
