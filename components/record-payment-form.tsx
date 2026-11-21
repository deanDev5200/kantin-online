"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Field, SubmitButton } from "./ui";

const formSchema = z.object({
  amount: z
    .string()
    .min(1, "Nominal wajib diisi")
    .regex(/^[0-9.]+$/, "Hanya angka"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function RecordPaymentForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSuccess(null);
    const amount = parseAmount(values.amount);
    if (amount == null) {
      setServerError("Nominal tidak valid");
      return;
    }
    const res = await fetch("/api/staff/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, amountRupiah: amount, note: values.note }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Gagal menyimpan setoran");
      return;
    }
    setSuccess("Setoran berhasil dicatat.");
    reset({ amount: "", note: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <Field label="Nominal setoran (Rp)" htmlFor="amount" error={errors.amount?.message}>
        <input id="amount" className="kc-input" inputMode="numeric" {...register("amount")} />
      </Field>
      <Field label="Catatan (opsional)" htmlFor="note" error={errors.note?.message}>
        <input id="note" className="kc-input" {...register("note")} />
      </Field>
      {serverError && <p className="kc-error">{serverError}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <SubmitButton>Simpan Setoran</SubmitButton>
    </form>
  );
}
