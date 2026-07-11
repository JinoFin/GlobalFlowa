import { GET as downloadAdminFile } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return downloadAdminFile(request, context);
}
