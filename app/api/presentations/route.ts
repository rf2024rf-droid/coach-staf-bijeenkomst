import { createPresentation, errorPayload } from "@/db/store";
import { assertModerator } from "@/lib/moderatorAuth";

export async function POST(request: Request) {
  try {
    assertModerator(request);
    const payload = (await request.json().catch(() => ({}))) as { title?: unknown };
    const result = await createPresentation(payload.title);
    return Response.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
