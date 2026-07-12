import { NextResponse } from "next/server";
import { isVerifiedCustomer } from "@/lib/auth/customer";
import { claimRequestsForCurrentCustomer } from "@/lib/portal/claim-requests";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { hasTrustedMutationOrigin } from "@/lib/http/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) {
    return NextResponse.json({ success: false, error: "Request not allowed." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? "0") > 0) {
    return NextResponse.json({ success: false, error: "Request body is not accepted." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user || !(await isVerifiedCustomer(supabase, data.user))) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const claimedCount = await claimRequestsForCurrentCustomer(supabase);
    return NextResponse.json({ success: true, claimed_count: claimedCount });
  } catch {
    return NextResponse.json({ success: false, error: "Requests could not be linked right now." }, { status: 500 });
  }
}
