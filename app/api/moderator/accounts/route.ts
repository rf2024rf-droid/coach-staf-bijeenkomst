import { errorPayload, listModeratorAccounts } from "@/db/store";
import { assertAdminActor } from "@/lib/accountAuth";

export async function GET(request: Request) {
  try {
    assertAdminActor(request);
    const accounts = await listModeratorAccounts();
    return Response.json({ accounts });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
