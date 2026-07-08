import { errorPayload } from "@/db/store";
import { clearAccountCookieHeader } from "@/lib/accountAuth";
import {
  createModeratorToken,
  moderatorCookieHeader,
  verifyModeratorPassword,
} from "@/lib/moderatorAuth";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { password?: unknown };

    if (!verifyModeratorPassword(payload.password)) {
      return Response.json({ error: "Wachtwoord klopt niet." }, { status: 401 });
    }

    const headers = new Headers();
    headers.append("set-cookie", moderatorCookieHeader(createModeratorToken()));
    headers.append("set-cookie", clearAccountCookieHeader());

    return Response.json(
      { ok: true },
      { headers }
    );
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
