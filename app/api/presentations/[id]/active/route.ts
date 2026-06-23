import { errorPayload, setActiveQuestion } from "@/db/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = new URL(request.url).searchParams.get("key") ?? "";
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
