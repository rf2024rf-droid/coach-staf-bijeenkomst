import { errorPayload, getPresenterPayload } from "@/db/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const result = await getPresenterPayload(id, key);
    return Response.json(result);
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
