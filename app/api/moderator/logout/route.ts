import { clearModeratorCookieHeader } from "@/lib/moderatorAuth";

export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "set-cookie": clearModeratorCookieHeader(),
      },
    }
  );
}
