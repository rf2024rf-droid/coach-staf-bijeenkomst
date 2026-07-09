import { errorPayload, listModeratorPresentations } from "@/db/store";
import { assertActiveModeratorActor } from "@/lib/accountAccess";

export async function GET(request: Request) {
  try {
    const actor = await assertActiveModeratorActor(request);
    const presentations = await listModeratorPresentations(actor);
    return Response.json({ presentations });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
