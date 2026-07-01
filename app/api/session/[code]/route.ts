import { errorPayload, getPublicSession } from "@/db/store";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const participantId = new URL(request.url).searchParams.get("participantId") ?? "";
    const result = await getPublicSession(code, participantId);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
