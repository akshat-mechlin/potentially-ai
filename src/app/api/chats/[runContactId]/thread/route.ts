import {
  loadProspectThread,
  prospectThreadErrorResponse,
  sendProspectThreadMessage,
} from "@/lib/api/prospect-thread";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runContactId: string }> },
) {
  try {
    const { runContactId } = await params;
    return await loadProspectThread(runContactId);
  } catch (error) {
    return prospectThreadErrorResponse(error, "load");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runContactId: string }> },
) {
  try {
    const { runContactId } = await params;
    return await sendProspectThreadMessage(runContactId, request);
  } catch (error) {
    return prospectThreadErrorResponse(error, "send");
  }
}
