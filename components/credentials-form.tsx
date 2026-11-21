"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { changeCredentialsSchema } from "@/lib/validation";
import { Field, SubmitButton } from "./ui";

type FormValues = z.infer<typeof changeCredentialsSchema>;

export function CredentialsForm({ currentUsername }: { currentUsername: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(changeCredentialsSchema),
    defaultValues: { username: currentUsername, currentPassword: "", newPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSuccess(null);
    const res = await fetch("/api/account/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Gagal menyimpan perubahan");
      return;
    }
    setSuccess("Data login berhasil diperbarui.");
    reset({ username: data.username ?? values.username, currentPassword: "", newPassword: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <Field label="Username" htmlFor="username" error={errors.username?.message} hint="Huruf kecil dan angka, 3-20 karakter">
        <input id="username" className="kc-input" {...register("username")} />
      </Field>
      <Field label="Password saat ini" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <input id="currentPassword" type="password" className="kc-input" {...register("currentPassword")} />
      </Field>
      <Field
        label="Password baru (opsional)"
        htmlFor="newPassword"
        error={errors.newPassword?.message}
        hint="Kosongkan jika tidak ingin mengganti password"
      >
        <input id="newPassword" type="password" className="kc-input" {...register("newPassword")} />
      </Field>
      {serverError && <p className="kc-error">{serverError}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <SubmitButton>Simpan</SubmitButton>
    </form>
  );
}
