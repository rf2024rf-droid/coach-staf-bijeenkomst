import { errorPayload, setScreenView, type ScreenView } from "@/db/store";
import { resolvePresenterKey } from "@/lib/presenterAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = await resolvePresenterKey(request, id);
    const payload = (await request.json().catch(() => ({}))) as {
      screenView?: unknown;
      questionId?: unknown;
    };
    const screenView =
      payload.screenView === "qr" ||
      payload.screenView === "results" ||
      payload.screenView === "ranking" ||
      payload.screenView === "pause"
        ? payload.screenView
        : "question";
    const questionId = typeof payload.questionId === "string" ? payload.questionId : null;
    const result = await setScreenView(id, key, screenView as ScreenView, questionId);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
