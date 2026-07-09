import { assertActorAccountActive, getPresenterKeyForModerator } from "@/db/store";
import { getModeratorActor } from "@/lib/accountAuth";

export async function resolvePresenterKey(request: Request, presentationId: string) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (key) {
    return key;
  }

  const actor = getModeratorActor(request);
  if (actor) {
    await assertActorAccountActive(actor);
    return getPresenterKeyForModerator(presentationId, actor);
  }

  return "";
}
