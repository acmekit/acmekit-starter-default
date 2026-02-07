import { AcmeKitRequest, AcmekitResponse } from "@acmekit/framework/http";

export async function GET(
  req: AcmeKitRequest,
  res: AcmekitResponse
) {
  res.sendStatus(200);
}
