import { clearAccountCookieHeader } from "@/lib/accountAuth";
import { clearModeratorCookieHeader } from "@/lib/moderatorAuth";

export async function POST() {
  const headers = new Headers();
  headers.append("set-cookie", clearAccountCookieHeader());
  headers.append("set-cookie", clearModeratorCookieHeader());

  return Response.json({ ok: true }, { headers });
}
