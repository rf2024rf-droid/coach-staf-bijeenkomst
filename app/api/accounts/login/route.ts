import { activateAccount, errorPayload } from "@/db/store";
import {
  accountCookieHeader,
  createAccountToken,
  loginWithSupabase,
  validateAccountCredentials,
} from "@/lib/accountAuth";
import { clearModeratorCookieHeader } from "@/lib/moderatorAuth";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };
    const { email, password } = validateAccountCredentials(payload.email, payload.password);
    const user = await loginWithSupabase(email, password);
    await activateAccount(user.email, user.userId);
    const headers = new Headers();
    headers.append("set-cookie", accountCookieHeader(createAccountToken(user.userId, user.email)));
    headers.append("set-cookie", clearModeratorCookieHeader());

    return Response.json(
      { ok: true },
      { headers }
    );
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
