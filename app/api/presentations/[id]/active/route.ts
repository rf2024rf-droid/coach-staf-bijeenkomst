import { errorPayload, setActiveQuestion } from "@/db/store";
import { resolvePresenterKey } from "@/lib/presenterAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = await resolvePresenterKey(request, id);
    const payload = (await request.json().catch(() => ({}))) as {
      questionId?: unknown;
    };
    const questionId = typeof payload.questionId === "string" ? payload.questionId : null;
    const result = await setActiveQuestion(id, key, questionId);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
