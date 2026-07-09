import {
  deleteModeratorAccount,
  errorPayload,
  listModeratorAccounts,
  setModeratorAccountStatus,
} from "@/db/store";
import { assertAdminActor, deleteSupabaseAuthUser } from "@/lib/accountAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertAdminActor(request);
    const { id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as { action?: unknown };
    const status = payload.action === "deactivate" ? "deactivated" : "active";

    await setModeratorAccountStatus(id, status);
    const accounts = await listModeratorAccounts();
    return Response.json({ accounts });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertAdminActor(request);
    const { id } = await context.params;
    const deletion = await deleteModeratorAccount(id);
    let authCleanupWarning: string | null = null;

    try {
      await deleteSupabaseAuthUser(deletion.account.supabase_user_id);
    } catch (error) {
      authCleanupWarning =
        error instanceof Error
          ? error.message
          : "Supabase Auth-account kon niet automatisch worden verwijderd.";
    }

    const accounts = await listModeratorAccounts();
    return Response.json({
      accounts,
      presentationsDeleted: deletion.presentationsDeleted,
      authCleanupWarning,
    });
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
