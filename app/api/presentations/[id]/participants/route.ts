import { errorPayload, removeAllParticipants } from "@/db/store";
import { resolvePresenterKey } from "@/lib/presenterAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = await resolvePresenterKey(request, id);
    const result = await removeAllParticipants(id, key);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
