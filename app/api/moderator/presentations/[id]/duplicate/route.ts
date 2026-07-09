import { duplicatePresentation, errorPayload, listModeratorPresentations } from "@/db/store";
import { assertActiveModeratorActor } from "@/lib/accountAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await assertActiveModeratorActor(request);
    const { id } = await context.params;
    const presentation = await duplicatePresentation(id, actor);
    const presentations = await listModeratorPresentations(actor);
    return Response.json({ presentation, presentations }, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
