"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validation";
import { Field, SubmitButton } from "@/components/ui";
import type { z } from "zod";

type FormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? "Gagal masuk. Coba lagi.");
      return;
    }
    const role = data.role as string;
    if (role === "STUDENT") router.replace("/siswa");
    else if (role === "STAFF") router.replace("/staff");
    else if (role === "ADMIN") router.replace("/admin");
    else router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm kc-card p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Kantin Canggih</h1>
          <p className="kc-muted mt-1">Masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Username" htmlFor="username" error={errors.username?.message}>
            <input id="username" className="kc-input" autoComplete="username" {...register("username")} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              className="kc-input"
              autoComplete="current-password"
              {...register("password")}
            />
          </Field>
          {serverError && <p className="kc-error">{serverError}</p>}
          <SubmitButton className="kc-btn kc-btn-primary w-full">Masuk</SubmitButton>
        </form>
        <p className="kc-muted text-center mt-4">
          Lupa username/password? Hubungi admin.
        </p>
      </div>
    </main>
  );
}
