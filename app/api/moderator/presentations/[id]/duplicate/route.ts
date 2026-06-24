import { duplicatePresentation, errorPayload, listModeratorPresentations } from "@/db/store";
import { assertModerator } from "@/lib/moderatorAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertModerator(request);
    const { id } = await context.params;
    const presentation = await duplicatePresentation(id);
    const presentations = await listModeratorPresentations();
    return Response.json({ presentation, presentations }, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
