import { createPresentation, errorPayload } from "@/db/store";
import { assertActiveModeratorActor } from "@/lib/accountAccess";

export async function POST(request: Request) {
  try {
    const actor = await assertActiveModeratorActor(request);
    const payload = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      template?: unknown;
      presentationType?: unknown;
      workflowStatus?: unknown;
    };
    const result = await createPresentation(payload.title, payload.template, actor, {
      presentationType: payload.presentationType,
      workflowStatus: payload.workflowStatus,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
