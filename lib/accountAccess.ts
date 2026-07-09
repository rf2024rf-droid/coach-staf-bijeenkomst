import { assertActorAccountActive } from "@/db/store";
import { assertModeratorActor } from "@/lib/accountAuth";

export async function assertActiveModeratorActor(request: Request) {
  const actor = assertModeratorActor(request);
  return assertActorAccountActive(actor);
}
