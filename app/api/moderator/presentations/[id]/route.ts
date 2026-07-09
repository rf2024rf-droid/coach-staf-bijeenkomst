import {
  deletePresentation,
  errorPayload,
  listModeratorPresentations,
  renamePresentation,
} from "@/db/store";
import { assertActiveModeratorActor } from "@/lib/accountAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await assertActiveModeratorActor(request);
    const { id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as { title?: unknown };
    await renamePresentation(id, payload.title, actor);
    const presentations = await listModeratorPresentations(actor);
    return Response.json({ presentations });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await assertActiveModeratorActor(request);
    const { id } = await context.params;
    await deletePresentation(id, actor);
    const presentations = await listModeratorPresentations(actor);
    return Response.json({ presentations });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
