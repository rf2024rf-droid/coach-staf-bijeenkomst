import { errorPayload, setScreenView, type ScreenView } from "@/db/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const payload = (await request.json().catch(() => ({}))) as {
      screenView?: unknown;
      questionId?: unknown;
    };
    const screenView =
      payload.screenView === "qr" || payload.screenView === "results"
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
