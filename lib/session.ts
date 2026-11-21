import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import {
  CASHIER_COOKIE_NAME,
  CASHIER_TTL_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "./constants";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (min 16 chars)");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function encode(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode<T>(raw: string): T | null {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!safeEqual(sign(body), signature)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

// ---- User session ----

export type SessionPayload = {
  userId: string;
  role: Role;
  username: string;
  exp: number; // epoch seconds
};

export async function createUserSession(data: {
  userId: string;
  role: Role;
  username: string;
}): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const value = encode({ ...data, exp });
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  const payload = decode<SessionPayload>(raw);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export async function destroyUserSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

// ---- Cashier session ----

export type CashierSessionPayload = { exp: number };

export async function createCashierSession(): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + CASHIER_TTL_SECONDS;
  const value = encode({ exp });
  const jar = await cookies();
  jar.set(CASHIER_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CASHIER_TTL_SECONDS,
  });
}

export async function getCashierSession(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(CASHIER_COOKIE_NAME)?.value;
  if (!raw) return false;
  const payload = decode<CashierSessionPayload>(raw);
  if (!payload) return false;
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export async function destroyCashierSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(CASHIER_COOKIE_NAME);
}
