import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE_NAME = "turnieje_admin";

function expectedToken(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Brak ADMIN_PASSWORD w .env.local");
  return createHash("sha256").update("turnieje:" + password).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(COOKIE_NAME)?.value === expectedToken();
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Brak uprawnień organizatora");
}

export async function loginWithPassword(password: string): Promise<boolean> {
  if (password !== process.env.ADMIN_PASSWORD) return false;
  const store = await cookies();
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 dni
    path: "/",
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
