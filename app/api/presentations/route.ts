import { createPresentation, errorPayload } from "@/db/store";
import { assertModeratorActor } from "@/lib/accountAuth";

export async function POST(request: Request) {
  try {
    const actor = assertModeratorActor(request);
    const payload = (await request.json().catch(() => ({}))) as { title?: unknown; template?: unknown };
    const result = await createPresentation(payload.title, payload.template, actor);
    return Response.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
