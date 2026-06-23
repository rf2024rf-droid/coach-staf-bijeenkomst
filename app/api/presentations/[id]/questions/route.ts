import {
  addQuestion,
  deleteQuestion,
  errorPayload,
  moveQuestion,
  updateQuestion,
} from "@/db/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const payload = (await request.json().catch(() => ({}))) as {
      type?: unknown;
      prompt?: unknown;
      options?: unknown;
    };
    const result = await addQuestion(id, key, payload);
    return Response.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const payload = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      questionId?: unknown;
      direction?: unknown;
      prompt?: unknown;
      options?: unknown;
    };
    const questionId = typeof payload.questionId === "string" ? payload.questionId : "";

    if (!questionId) {
      return Response.json({ error: "questionId is verplicht." }, { status: 400 });
    }

    if (payload.action === "move") {
      const direction = payload.direction === "up" ? "up" : "down";
      const result = await moveQuestion(id, key, questionId, direction);
      return Response.json(result);
    }

    const result = await updateQuestion(id, key, questionId, payload);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";
    const questionId = url.searchParams.get("questionId") ?? "";

    if (!questionId) {
      return Response.json({ error: "questionId is verplicht." }, { status: 400 });
    }

    const result = await deleteQuestion(id, key, questionId);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
