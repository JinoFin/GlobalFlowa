import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { passwordConfirmationSchema } from "@/lib/auth/validation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = passwordConfirmationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const recoverySession = cookieStore.get("gf-recovery")?.value === "1";

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || (!recoverySession && !(await isVerifiedCustomer(supabase, data.user)))) {
    return NextResponse.json({ ok: false, message: "This password-recovery link is invalid or expired." }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return NextResponse.json(
      { ok: false, message: error.code === "weak_password" ? "Choose a stronger password." : "Password could not be updated." },
      { status: 400 },
    );
  }

  if (recoverySession) cookieStore.delete("gf-recovery");
  return NextResponse.json({ ok: true });
}
