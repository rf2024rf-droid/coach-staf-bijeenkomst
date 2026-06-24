import { errorPayload, listModeratorPresentations } from "@/db/store";
import { assertModerator } from "@/lib/moderatorAuth";

export async function GET(request: Request) {
  try {
    assertModerator(request);
    const presentations = await listModeratorPresentations();
    return Response.json({ presentations });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
