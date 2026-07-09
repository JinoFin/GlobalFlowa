import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isAdminUser } from "@/lib/supabase/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRow = {
  id: string;
  created_at: string;
  status: string;
  urgency: string | null;
  company_name: string;
  contact_person: string;
  email: string;
  country: string;
  main_service: string | null;
};

export async function GET() {
  let supabase;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase is not configured." },
      { status: 503 },
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!(await isAdminUser(supabase, userData.user))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("service_requests")
    .select("id, created_at, status, urgency, company_name, contact_person, email, country, main_service")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ExportRow[];
  const csv = [
    ["id", "created_at", "status", "urgency", "company_name", "contact_person", "email", "country", "main_service"],
    ...rows.map((row) => [
      row.id,
      row.created_at,
      row.status,
      row.urgency ?? "",
      row.company_name,
      row.contact_person,
      row.email,
      row.country,
      row.main_service ?? "",
    ]),
  ]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=globalflowa-requests.csv",
    },
  });
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
