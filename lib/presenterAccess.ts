import { getPresenterKeyForModerator } from "@/db/store";
import { isModeratorRequest } from "@/lib/moderatorAuth";

export async function resolvePresenterKey(request: Request, presentationId: string) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (key) {
    return key;
  }

  if (isModeratorRequest(request)) {
    return getPresenterKeyForModerator(presentationId);
  }

  return "";
}
