import {
  deletePresentation,
  errorPayload,
  listModeratorPresentations,
  renamePresentation,
} from "@/db/store";
import { assertModerator } from "@/lib/moderatorAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertModerator(request);
    const { id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as { title?: unknown };
    await renamePresentation(id, payload.title);
    const presentations = await listModeratorPresentations();
    return Response.json({ presentations });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertModerator(request);
    const { id } = await context.params;
    await deletePresentation(id);
    const presentations = await listModeratorPresentations();
    return Response.json({ presentations });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
