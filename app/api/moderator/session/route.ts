import { assertActorAccountActive, errorPayload, getModeratorUsage } from "@/db/store";
import {
  getModeratorActor,
  isAccountAuthConfigured,
  isSignupCodeRequired,
} from "@/lib/accountAuth";
import { isModeratorConfigured } from "@/lib/moderatorAuth";

export async function GET(request: Request) {
  try {
    let actor = getModeratorActor(request);
    if (actor) {
      try {
        actor = await assertActorAccountActive(actor);
      } catch (accountError) {
        const { status } = errorPayload(accountError);
        if (status === 401 || status === 403) {
          actor = null;
        } else {
          throw accountError;
        }
      }
    }
    const usage = await getModeratorUsage(actor);

    return Response.json({
      configured: isModeratorConfigured() || isAccountAuthConfigured(),
      moderatorConfigured: isModeratorConfigured(),
      accountAuthConfigured: isAccountAuthConfigured(),
      signupCodeRequired: isSignupCodeRequired(),
      authenticated: Boolean(actor),
      role: actor?.role ?? null,
      email: actor?.email ?? null,
      limits: usage,
    });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
