import { NextResponse } from "next/server";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { portalProfileSchema } from "@/lib/portal/profile-validation";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { hasTrustedMutationOrigin } from "@/lib/http/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Request not allowed." }, { status: 403 });
  }
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return NextResponse.json({ ok: false, message: "Customer profiles are not configured." }, { status: 503 });
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !(await isVerifiedCustomer(supabase, user))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const parsed = portalProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.flatten().formErrors[0] ?? "Check the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (parsed.data.section === "personal") {
    const personal = {
      full_name: parsed.data.full_name,
      job_title: parsed.data.job_title,
      phone: parsed.data.phone,
      preferred_language: parsed.data.preferred_language,
      timezone: parsed.data.timezone,
    };
    const { error } = await supabase
      .from("profiles")
      .update({ ...personal, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      console.error("Customer personal profile update failed", { userId: user.id, code: error.code });
      return NextResponse.json({ ok: false, message: "Your profile could not be updated." }, { status: 500 });
    }
  } else {
    const company = {
      legal_name: parsed.data.legal_name,
      trading_name: parsed.data.trading_name,
      registration_number: parsed.data.registration_number,
      vat_number: parsed.data.vat_number,
      country_code: parsed.data.country_code,
      address_line_1: parsed.data.address_line_1,
      address_line_2: parsed.data.address_line_2,
      city: parsed.data.city,
      postal_code: parsed.data.postal_code,
      website: parsed.data.website,
      contact_name: parsed.data.contact_name,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone,
    };
    const { error } = await supabase
      .from("customer_companies")
      .upsert(
        { ...company, owner_user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: "owner_user_id" },
      );
    if (error) {
      console.error("Customer company profile update failed", { userId: user.id, code: error.code });
      return NextResponse.json({ ok: false, message: "Your company profile could not be updated." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, message: "Your profile has been updated." });
}
