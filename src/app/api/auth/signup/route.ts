import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { signupSchema } from "@/lib/auth/validation";
import { getConfiguredSiteUrl } from "@/lib/auth/redirects";
import { hasTrustedMutationOrigin } from "@/lib/http/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Request not allowed." }, { status: 403 });
  }
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const callbackUrl = new URL("/auth/callback", getConfiguredSiteUrl());
  callbackUrl.searchParams.set("next", "/portal");

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    const weakPassword = error.code === "weak_password" || /password/i.test(error.message);
    const existingAccount = error.code === "user_already_exists" || /already registered/i.test(error.message);
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: weakPassword ? { password: ["Choose a stronger password."] } : undefined,
        message: existingAccount
          ? "An account may already exist for this email. Try signing in or resetting your password."
          : weakPassword
            ? undefined
            : "We could not create your account. Please try again.",
      },
      { status: 400 },
    );
  }

  if (data.user?.identities?.length === 0) {
    return NextResponse.json({
      ok: false,
      message: "An account may already exist for this email. Try signing in or resetting your password.",
    });
  }

  return NextResponse.json({ ok: true });
}
