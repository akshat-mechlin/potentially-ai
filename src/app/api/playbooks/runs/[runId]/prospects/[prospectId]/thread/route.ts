import {
  loadProspectThread,
  prospectThreadErrorResponse,
  sendProspectThreadMessage,
} from "@/lib/api/prospect-thread";

/** Legacy path — prefer /api/chats/[runContactId]/thread */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string; prospectId: string }> },
) {
  try {
    const { prospectId } = await params;
    return await loadProspectThread(prospectId);
  } catch (error) {
    return prospectThreadErrorResponse(error, "load");
  }
}

/** Legacy path — prefer /api/chats/[runContactId]/thread */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string; prospectId: string }> },
) {
  try {
    const { prospectId } = await params;
    return await sendProspectThreadMessage(prospectId, request);
  } catch (error) {
    return prospectThreadErrorResponse(error, "send");
  }
}
