import { errorPayload, removeParticipant } from "@/db/store";
import { resolvePresenterKey } from "@/lib/presenterAccess";

type RouteContext = {
  params: Promise<{ id: string; participantId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id, participantId } = await context.params;
    const key = await resolvePresenterKey(request, id);
    const result = await removeParticipant(id, key, participantId);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
