import { NextResponse } from "next/server";
import { getDbUser, setSession, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const f = await req.formData();
  const user_id = String(f.get("user_id") || "").trim();
  const password = String(f.get("password") || "");
  const user = await getDbUser(user_id);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.redirect(new URL("/login?e=Invalid login", req.url));
  }

  await setSession(user);

  if (user.must_reset_password) {
    return NextResponse.redirect(new URL("/reset-password", req.url));
  }

  if (
    String(user.role).includes("Admin") ||
    String(user.role).includes("HoD")
  ) {
    return NextResponse.redirect(new URL("/hod", req.url));
  }

  return NextResponse.redirect(new URL("/faculty", req.url));
}
