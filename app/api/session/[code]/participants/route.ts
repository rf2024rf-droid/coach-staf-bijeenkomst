import { errorPayload, registerParticipant } from "@/db/store";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as {
      participantId?: unknown;
      displayName?: unknown;
      anonymous?: unknown;
    };
    const result = await registerParticipant(code, payload);
    return Response.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
