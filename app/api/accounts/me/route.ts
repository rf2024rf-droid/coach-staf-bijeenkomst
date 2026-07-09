import { deleteOwnAccount, errorPayload } from "@/db/store";
import { assertActiveModeratorActor } from "@/lib/accountAccess";
import { clearAccountCookieHeader, deleteSupabaseAuthUser } from "@/lib/accountAuth";
import { clearModeratorCookieHeader } from "@/lib/moderatorAuth";

export async function DELETE(request: Request) {
  try {
    const actor = await assertActiveModeratorActor(request);
    const deletion = await deleteOwnAccount(actor);
    let authCleanupWarning: string | null = null;

    try {
      await deleteSupabaseAuthUser(deletion.account.supabase_user_id);
    } catch (error) {
      authCleanupWarning =
        error instanceof Error
          ? error.message
          : "Supabase Auth-account kon niet automatisch worden verwijderd.";
    }

    const headers = new Headers();
    headers.append("set-cookie", clearAccountCookieHeader());
    headers.append("set-cookie", clearModeratorCookieHeader());

    return Response.json(
      {
        ok: true,
        presentationsDeleted: deletion.presentationsDeleted,
        authCleanupWarning,
      },
      { headers }
    );
  } catch (error) {
    const { status, body } = errorPayload(error);
    return Response.json(body, { status });
  }
}
