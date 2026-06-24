import { errorPayload } from "@/db/store";
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

    return Response.json(
      { ok: true },
      {
        headers: {
          "set-cookie": moderatorCookieHeader(createModeratorToken()),
        },
      }
    );
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
