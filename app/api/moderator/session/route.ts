import { isModeratorConfigured, isModeratorRequest } from "@/lib/moderatorAuth";

export async function GET(request: Request) {
  return Response.json({
    configured: isModeratorConfigured(),
    authenticated: isModeratorRequest(request),
  });
}
