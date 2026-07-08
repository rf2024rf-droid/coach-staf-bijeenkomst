import { errorPayload, listModeratorPresentations } from "@/db/store";
import { assertModeratorActor } from "@/lib/accountAuth";

export async function GET(request: Request) {
  try {
    const actor = assertModeratorActor(request);
    const presentations = await listModeratorPresentations(actor);
    return Response.json({ presentations });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
