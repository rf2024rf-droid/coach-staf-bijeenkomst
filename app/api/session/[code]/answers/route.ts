import { errorPayload, submitAnswer } from "@/db/store";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as {
      participantId?: unknown;
      participantName?: unknown;
      optionId?: unknown;
      textAnswer?: unknown;
    };
    const result = await submitAnswer(code, payload);
    return Response.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
