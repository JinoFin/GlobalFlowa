import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { safeAuthDestination } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const destination = safeAuthDestination(url.searchParams.get("next"));
  const loginError = new URL("/portal/login", url.origin);
  loginError.searchParams.set("error", "verification_failed");

  if (!code) return NextResponse.redirect(loginError);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return NextResponse.redirect(loginError);

    if (destination === "/portal/update-password") {
      const cookieStore = await cookies();
      cookieStore.set("gf-recovery", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/portal/update-password",
        maxAge: 10 * 60,
      });
      return NextResponse.redirect(new URL(destination, url.origin));
    }

    if (!(await isVerifiedCustomer(supabase, data.user))) {
      await supabase.auth.signOut();
      loginError.searchParams.set("error", "account_unavailable");
      return NextResponse.redirect(loginError);
    }

    return NextResponse.redirect(new URL(destination, url.origin));
  } catch {
    return NextResponse.redirect(loginError);
  }
}
