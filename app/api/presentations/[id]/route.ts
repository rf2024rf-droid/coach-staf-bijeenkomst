import { errorPayload, getPresenterPayload, updatePresentationSettings } from "@/db/store";
import { resolvePresenterKey } from "@/lib/presenterAccess";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = await resolvePresenterKey(request, id);
    const result = await getPresenterPayload(id, key);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = await resolvePresenterKey(request, id);
    const payload = (await request.json().catch(() => ({}))) as {
      idleScreenText?: unknown;
      generalScreenBackgroundColor?: unknown;
      generalScreenFontFamily?: unknown;
      generalScreenFontSize?: unknown;
      screenSettings?: unknown;
      title?: unknown;
      presentationType?: unknown;
      workflowStatus?: unknown;
    };
    const result = await updatePresentationSettings(id, key, payload);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
