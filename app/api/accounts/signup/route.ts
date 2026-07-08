import {
  createPendingAccount,
  deletePendingAccount,
  errorPayload,
  updatePendingAccountSupabaseUserId,
} from "@/db/store";
import {
  isSignupCodeRequired,
  signUpWithSupabase,
  validateAccountCredentials,
  verifySignupCode,
} from "@/lib/accountAuth";

function getRedirectUrl(request: Request) {
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  return `${origin}/moderator?accountVerified=1`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
      signupCode?: unknown;
    };

    if (isSignupCodeRequired() && !verifySignupCode(payload.signupCode)) {
      return Response.json({ error: "Uitnodigingscode klopt niet." }, { status: 403 });
    }

    const { email, password } = validateAccountCredentials(payload.email, payload.password);
    await createPendingAccount(email);

    try {
      const authResult = await signUpWithSupabase(email, password, getRedirectUrl(request));
      await updatePendingAccountSupabaseUserId(email, authResult.user?.id);
    } catch (error) {
      await deletePendingAccount(email);
      throw error;
    }

    return Response.json(
      {
        ok: true,
        message: "Account aangemaakt. Check je e-mail om je account te activeren.",
      },
      { status: 201 }
    );
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
